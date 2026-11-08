"""M1.1 delivery transport only. No WeChat access, subprocess capture, or people database."""
import argparse,base64,hashlib,json,os,re,secrets,shutil,socket,sqlite3,subprocess,sys,threading,time,uuid
from contextlib import contextmanager
from datetime import datetime,timezone
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs,unquote,urlparse

SCHEMA='xiaowang.delivery.event.v1'
MAX_FILE=15*1024*1024
TYPES={'desktop_text','desktop_file','shared_text','shared_file','synthetic_capture'}
def now():return datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
def canonical(value):return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def digest(value):return hashlib.sha256(canonical(value).encode()).hexdigest()
def string(value,label,limit):
 if not isinstance(value,str) or not value.strip() or len(value)>limit:raise ValueError(label)
 return value

def iso(value):
 if not isinstance(value,str) or not re.search(r'(Z|[+-]\d{2}:\d{2})$',value):raise ValueError('timestamp_timezone')
 try:datetime.fromisoformat(value.replace('Z','+00:00'))
 except ValueError:raise ValueError('timestamp')
 return value

# ---------- 微信聊天抓取（用户明确点击后才执行；只读、只导出交接 .md） ----------
CAPTURE=Path(__file__).resolve().parents[1]/'抓取'
CAP_SCRIPT=CAPTURE/'fetch'/'xiaowang_fetch.py'
CAP_CFG=CAPTURE/'config'/'handoff.v1.json'
CHAT_LINE=re.compile(r'^\s{2}(.+?)\s{2,}(\d+)\s*条\s+(\S+)(?:\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}))?\s*$')
MSG_LINE=re.compile(r'^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s*([^：]{1,60})：([\s\S]*)$')

def capture_env():
 return dict(os.environ,PYTHONIOENCODING='utf-8',PYTHONUTF8='1',WECHAT_GROUP_WORKSPACE=str(capture_cfg()['roots']['workbuddy_work']))

def capture_cfg():
 return json.loads(CAP_CFG.read_text(encoding='utf-8'))

def capture_run(args,timeout=600):
 if not CAP_SCRIPT.is_file():raise ValueError('抓取组件缺失')
 p=subprocess.run([sys.executable,str(CAP_SCRIPT)]+args,capture_output=True,text=True,encoding='utf-8',errors='replace',env=capture_env(),timeout=timeout,cwd=str(CAP_SCRIPT.parent))
 return p.returncode,(p.stdout or '')+(p.stderr or '')

WECHAT_ROOT=Path(os.environ.get('XW_WECHAT_ROOT') or (Path.home()/'Documents'/'xwechat_files'))

def online_account():
 '''按登录目录最近活动时间判定当前在线账号（不写死 wxid）。'''
 best=None
 login=WECHAT_ROOT/'all_users'/'login'
 if not login.is_dir():return ''
 for d in login.glob('wxid_*'):
  try:latest=max((p.stat().st_mtime for p in d.rglob('*') if p.is_file()),default=0)
  except OSError:continue
  if best is None or latest>best[0]:best=(latest,d.name)
 return best[1] if best else ''

def account_db(wxid):
 if not wxid:return None
 for d in WECHAT_ROOT.glob(wxid+'*'):
  p=d/'db_storage'
  if p.is_dir():return p
 return None

def capture_run_retry(args,timeout=1800,tries=3):
 '''解密刚写完时库可能短暂不可读，等待后重试同一动作。'''
 code,out='',''
 for i in range(tries):
  code,out=capture_run(args,timeout)
  if code==0 or 'file is not a database' not in out:return code,out
  time.sleep(2+i*2)
 return code,out

def chat_list(kind):
 if kind=='person':
  # 直接用技能脚本列私聊对象（合并包包装器会丢掉 --persons 需要的占位群名）
  skill=Path(capture_cfg()['skill']['dir'])/'scripts'/'fetch_group.py'
  db=account_db(online_account())
  p=subprocess.run([sys.executable,str(skill),'dummy','--persons']+(['--db-dir',str(db)] if db else []),capture_output=True,text=True,encoding='utf-8',errors='replace',env=capture_env(),timeout=600,cwd=str(skill.parent))
  code,out=p.returncode,(p.stdout or '')+(p.stderr or '')
 else:
  db=account_db(online_account());args=['--list']+(['--db-dir',str(db)] if db else [])
  code,out=capture_run_retry(args,timeout=300)
  if not out.strip() or 'Traceback' in out or 'not a database' in out:
   code,out=capture_run(['--list'],timeout=300)
   out='（在线账号解密失败，已回退到最近一次可读快照）\n'+out
 items=[]
 for line in out.splitlines():
  m=CHAT_LINE.match(line)
  if m:items.append({'name':m.group(1).strip(),'count':int(m.group(2)),'id':m.group(3),'last_at':m.group(4) or ''})
 return code,out,items

def chat_parse(md):
 head={};msgs=[]
 for line in md.splitlines():
  m=MSG_LINE.match(line)
  if m:msgs.append({'at':m.group(1),'speaker':m.group(2).strip(),'text':m.group(3)});continue
  if msgs and line.startswith('    '):msgs[-1]['text']+='\n'+line[4:];continue
  if not msgs:
   kv=re.match(r'^([^：]{1,10})：(.+)$',line)
   if kv:head[kv.group(1).strip()]=kv.group(2).strip()
 speakers=[]
 for m in msgs:
  if m['speaker'] not in speakers:speakers.append(m['speaker'])
 return head,msgs,speakers

def stale_caches():
 base=Path(capture_cfg()['roots']['workbuddy_work'])
 found=[]
 try:
  for d in base.rglob('decrypted_*'):
   if d.is_dir():found.append(d)
 except OSError:pass
 return found

def force_live_read():
 '''把旧的解密快照挪开，强制从当前在线微信重新解密读取。返回被挪开的目录。'''
 moved=[]
 stamp=time.strftime('%Y%m%d%H%M%S')
 for d in stale_caches():
  target=d.with_name(d.name+'.stale-'+stamp)
  try:d.rename(target);moved.append(target)
  except OSError:pass
 return moved

def drop_stale(moved):
 for d in moved:
  try:shutil.rmtree(d,ignore_errors=True)
  except Exception:pass


# 账号目录不写死：优先环境变量，否则按登录目录最近活动账号解析（见 account_db）。
ACCOUNT_DB=Path(os.environ['XW_WECHAT_DB']) if os.environ.get('XW_WECHAT_DB') else None

def refresh_snapshot(name,kind,days):
 '''先按指定账号重新解密一次，再普通读取；失败则回退到现有快照。'''
 work=Path(capture_cfg()['roots']['workbuddy_work'])
 moved=[]
 stamp=time.strftime('%H%M%S')
 try:
  wxid=online_account()
  for d in work.rglob('decrypted_*'):
   if d.is_dir() and wxid and wxid in d.name:
    target=d.with_name('_stale_'+d.name+'_'+stamp)
    d.rename(target);moved.append(target)
  db=ACCOUNT_DB or account_db(online_account())
  args=[name]+(['--person'] if kind=='person' else [])+['--days',str(days),'--db-dir',str(db or '')]
  try:capture_run(args,timeout=900)
  except Exception:pass
 finally:
  for d in moved:
   try:shutil.rmtree(d,ignore_errors=True)
   except Exception:pass

def chat_fetch(kind,name,days,live=False):
 started=time.time()
 if live:refresh_snapshot(name,kind,days)
 db=account_db(online_account())
 args=[name]+(['--person'] if kind=='person' else [])+['--days',str(days)]+(['--db-dir',str(db)] if db else [])
 code,out=capture_run_retry(args,timeout=1800)
 drop=Path(capture_cfg()['roots']['dropbox'])
 file=None;md=''
 if drop.is_dir():
  cands=sorted([p for p in drop.glob('xb-*.md') if p.is_file()],key=lambda p:p.stat().st_mtime,reverse=True)[:80]
  for p in cands:
   try:h,_,_=chat_parse(p.read_text(encoding='utf-8'))
   except Exception:continue
   if h.get('群名')==name or h.get('对象')==name:file=p;break
  if file is None:
   fresh=[p for p in cands if p.stat().st_mtime>=started-10]
   if fresh:file=fresh[0]
  if file:md=file.read_text(encoding='utf-8')
 head,msgs,speakers=chat_parse(md)
 return code,out,file,md,head,msgs,speakers


def normalize_event(v):
 required={'schema','event_id','source_type','source_id','name','captured_at','occurred_at','content'}
 if not isinstance(v,dict) or set(v)!=required or v['schema']!=SCHEMA:raise ValueError('event_schema')
 try:
  if str(uuid.UUID(v['event_id']))!=v['event_id']:raise ValueError()
 except (ValueError,TypeError,AttributeError):raise ValueError('event_id')
 if v['source_type'] not in TYPES:raise ValueError('source_type')
 string(v['source_id'],'source_id',500);string(v['name'],'name',200);iso(v['captured_at'])
 if v['occurred_at'] is not None:iso(v['occurred_at'])
 c=v['content'];blob=None
 if not isinstance(c,dict):raise ValueError('content')
 if c.get('kind')=='text':
  if set(c)!={'kind','text'}:raise ValueError('text_fields')
  string(c['text'],'text',250000)
 elif c.get('kind')=='file':
  if set(c)!={'kind','name','mime','size','sha256','base64'}:raise ValueError('file_fields')
  name=string(c['name'],'file_name',200)
  if '/' in name or '\\' in name or Path(name).suffix.lower() not in {'.txt','.md','.csv','.docx','.pdf','.pptx'}:raise ValueError('file_extension')
  string(c['mime'],'mime',150)
  if type(c['size']) is not int or not 0<c['size']<=MAX_FILE:raise ValueError('file_size')
  try:blob=base64.b64decode(c['base64'],validate=True)
  except (ValueError,TypeError):raise ValueError('file_base64')
  if len(blob)!=c['size'] or hashlib.sha256(blob).hexdigest()!=c['sha256']:raise ValueError('file_digest')
  ext=Path(name).suffix.lower()
  if ext=='.pdf' and not blob.startswith(b'%PDF-'):raise ValueError('pdf_magic')
  if ext in {'.docx','.pptx'} and not blob.startswith(b'PK\x03\x04'):raise ValueError('office_magic')
 else:raise ValueError('content_kind')
 event=json.loads(json.dumps(v));event['content'].pop('base64',None)
 return event,blob

class Store:
 def __init__(self,folder):
  folder=Path(folder);folder.mkdir(parents=True,exist_ok=True);self.path=folder/'投递队列.sqlite3'
  with self.connect() as db:
   db.execute('PRAGMA journal_mode=WAL');db.execute('CREATE TABLE IF NOT EXISTS deliveries(event_id TEXT PRIMARY KEY,payload_hash TEXT NOT NULL,event_json TEXT NOT NULL,attachment BLOB,status TEXT NOT NULL,accepted_at TEXT NOT NULL,receipt_json TEXT)')
  try:os.chmod(self.path,0o600)
  except OSError:pass
 @contextmanager
 def connect(self):
  db=sqlite3.connect(str(self.path),timeout=10)
  try:
   db.row_factory=sqlite3.Row
   with db:
    db.execute('PRAGMA synchronous=FULL')
    yield db
  finally:db.close()
 def submit(self,payload):
  event,blob=normalize_event(payload);h=digest(event)
  with self.connect() as db:
   db.execute('BEGIN IMMEDIATE');old=db.execute('SELECT * FROM deliveries WHERE event_id=?',(event['event_id'],)).fetchone()
   if old:
    if old['payload_hash']!=h:raise FileExistsError('event_id_payload_conflict')
    return self.envelope(old)
   db.execute('INSERT INTO deliveries VALUES(?,?,?,?,?,?,?)',(event['event_id'],h,canonical(event),blob,'queued',now(),None))
   return self.envelope(db.execute('SELECT * FROM deliveries WHERE event_id=?',(event['event_id'],)).fetchone())
 def envelope(self,row):return {'event':json.loads(row['event_json']),'payload_hash':row['payload_hash'],'status':row['status'],'accepted_at':row['accepted_at'],'receipt':json.loads(row['receipt_json']) if row['receipt_json'] else None}
 def pending(self):
  with self.connect() as db:return [self.envelope(r) for r in db.execute("SELECT * FROM deliveries WHERE status='queued' ORDER BY accepted_at,event_id LIMIT 20")]
 def get(self,eid):
  with self.connect() as db:
   r=db.execute('SELECT * FROM deliveries WHERE event_id=?',(eid,)).fetchone()
   if not r:raise KeyError('event_not_found')
   return self.envelope(r)
 def attachment(self,eid):
  with self.connect() as db:
   r=db.execute('SELECT attachment,event_json FROM deliveries WHERE event_id=?',(eid,)).fetchone()
   if not r or r['attachment'] is None:raise KeyError('file_not_found')
   return bytes(r['attachment']),json.loads(r['event_json'])['content']
 def ack(self,r):
  required={'receipt_id','event_id','payload_hash','source_record_id','receiver_id','received_at','extraction_status'}
  if not isinstance(r,dict) or set(r)!=required:raise ValueError('receipt_fields')
  for k in required:string(r[k],k,500)
  iso(r['received_at'])
  if r['extraction_status'] not in {'ok','partial','failed','text'}:raise ValueError('extraction_status')
  with self.connect() as db:
   db.execute('BEGIN IMMEDIATE');row=db.execute('SELECT * FROM deliveries WHERE event_id=?',(r['event_id'],)).fetchone()
   if not row:raise KeyError('event_not_found')
   if row['payload_hash']!=r['payload_hash']:raise FileExistsError('receipt_hash_conflict')
   if row['receipt_json'] and canonical(json.loads(row['receipt_json']))!=canonical(r):raise FileExistsError('receipt_conflict')
   db.execute("UPDATE deliveries SET status='received',receipt_json=? WHERE event_id=?",(canonical(r),r['event_id']))
   return {'status':'received','receipt':r}
 def counts(self):
  with self.connect() as db:return dict(db.execute('SELECT status,COUNT(*) FROM deliveries GROUP BY status').fetchall())

class State:
 def __init__(self,folder,html,port):
  self.store=Store(folder);self.html=Path(html);self.origin=f'http://127.0.0.1:{port}';self.tokens={'desktop':secrets.token_urlsafe(32),'h5':secrets.token_urlsafe(32),'manager':secrets.token_urlsafe(32)};self.revoked=False;self.presence=0;self.desktop_visible=None;self.desktop_command=None;self.desktop_applied=None;self.auth_file=Path(folder)/'本机配对.json'
 def write_auth(self):
  value={'origin':self.origin,'tokens':self.tokens,'revoked':self.revoked,'created_at':now()};temp=self.auth_file.with_suffix('.tmp')
  with open(temp,'w',encoding='utf-8') as f:
   try:os.chmod(temp,0o600)
   except OSError:pass
   f.write(json.dumps(value,ensure_ascii=False));f.flush();os.fsync(f.fileno())
  os.replace(temp,self.auth_file)

class LoopbackHTTPServer(ThreadingHTTPServer):
 # Windows SO_REUSEADDR permits overlapping listeners; require exclusive ownership.
 allow_reuse_address=os.name!='nt'
 allow_reuse_port=False
 def server_bind(self):
  if os.name=='nt':self.socket.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1)
  super().server_bind()

def create_server(folder,html,port=8915):
 state=State(folder,html,port)
 class H(BaseHTTPRequestHandler):
  protocol_version='HTTP/1.1'
  def setup(self):super().setup();self.connection.settimeout(8)
  def log_message(self,*args):pass
  def send(self,value,code=200,ctype='application/json; charset=utf-8'):
   raw=value if isinstance(value,bytes) else json.dumps(value,ensure_ascii=False).encode()
   if code>=400:self.close_connection=True
   self.send_response(code)
   if self.close_connection:self.send_header('Connection','close')
   self.send_header('Content-Type',ctype);self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.send_header('Referrer-Policy','no-referrer');self.send_header('X-Content-Type-Options','nosniff');self.send_header('X-Frame-Options','DENY');self.end_headers();self.wfile.write(raw)
  def authorized(self,roles=('desktop','h5')):
   if self.headers.get('Host')!=state.origin.split('//')[1]:self.send({'error':'untrusted_host'},403);return False
   origin=self.headers.get('Origin');site=self.headers.get('Sec-Fetch-Site')
   if origin and origin!=state.origin or site in {'cross-site','same-site'}:self.send({'error':'untrusted_origin'},403);return False
   raw=self.headers.get('Authorization','');role=next((r for r in roles if state.tokens[r] and secrets.compare_digest(raw,'Bearer '+state.tokens[r])),None)
   if (state.revoked and role!='manager') or not role:self.send({'error':'unauthorized'},401);return False
   if role=='h5' and not (origin==state.origin or site=='same-origin'):self.send({'error':'browser_origin_required'},403);return False
   if role in {'desktop','manager'} and (origin is not None or site is not None or self.headers.get('X-XW-Client')!=role+'-v1'):self.send({'error':'native_client_required'},403);return False
   return role
  def do_OPTIONS(self):self.send({'error':'cross_origin_disabled'},403)
  def do_GET(self):
   if unquote(self.path) in ['/','/小王.html','/candidate.html']:
    if self.headers.get('Host')!=state.origin.split('//')[1]:return self.send({'error':'host'},403)
    return self.send(state.html.read_bytes(),ctype='text/html; charset=utf-8')
   if self.path=='/health':return self.send({'service':'xiaowang-delivery','version':'1.1','auth_required':True})
   role=self.authorized()
   if not role:return
   try:
    if self.path=='/api/lists':return self.send({'sources':[{'id':'synthetic-group','name':'虚构测试群','mode':'synthetic'}],'private_chat_capture':False})
    if self.path.startswith('/api/chat/list'):
     q=parse_qs(urlparse(self.path).query);kind=(q.get('kind') or ['group'])[0]
     if kind not in ('group','person'):raise ValueError('chat_kind')
     code,out,items=chat_list(kind)
     return self.send({'ok':code==0,'kind':kind,'items':items,'total':len(items),'account':online_account(),'hint':'' if items else out.strip()[-600:]})
    if self.path in ['/api/status','/ping']:return self.send({'service':'xiaowang-delivery','version':'1.1','queue':state.store.counts(),'desktop_available':state.presence>0 and time.monotonic()-state.presence<8,'desktop_visible':state.desktop_visible if time.monotonic()-state.presence<8 else None,'desktop_control_pending':bool(state.desktop_command),'desktop_applied':state.desktop_applied,'capture_mode':'synthetic-and-user-provided-only'})
    if self.path=='/api/pending' and role=='h5':return self.send({'deliveries':state.store.pending()})
    if re.fullmatch(r'/api/events/[0-9a-f-]{36}',self.path) and role=='desktop':return self.send(state.store.get(self.path.rsplit('/',1)[1]))
    if re.fullmatch(r'/api/files/[0-9a-f-]{36}',self.path) and role=='h5':
     blob,c=state.store.attachment(self.path.rsplit('/',1)[1]);return self.send(blob,ctype='application/octet-stream')
    self.send({'error':'not_found_or_forbidden'},404)
   except KeyError:self.send({'error':'not_found'},404)
  def do_POST(self):
   role=self.authorized(('manager',) if self.path=='/api/stop' else ('desktop','h5'))
   if not role:return
   try:
    if self.headers.get('Content-Type','').split(';')[0]!='application/json':return self.send({'error':'json_required'},415)
    n=int(self.headers.get('Content-Length','0'))
    if not 0<n<=22*1024*1024:return self.send({'error':'body_limit'},413)
    raw=self.rfile.read(n)
    if len(raw)!=n:raise ValueError('truncated_body')
    v=json.loads(raw)
    if self.path=='/api/deliver' and role=='desktop':return self.send(state.store.submit(v),202)
    if self.path=='/api/chat/fetch':
     if not isinstance(v,dict) or set(v)-{'kind','name','days','confirm'}:raise ValueError('chat_fields')
     kind=v.get('kind');name=str(v.get('name') or '').strip();days=v.get('days',7)
     if kind not in ('group','person'):raise ValueError('chat_kind')
     if not name or len(name)>80:raise ValueError('chat_name')
     if type(days) is not int or not 1<=days<=30:raise ValueError('chat_days')
     if v.get('confirm') is not True:raise ValueError('confirm_required')
     code,out,file,md,head,msgs,speakers=chat_fetch(kind,name,days)
     ok=code==0 and bool(msgs)
     hint='' if ok else out.strip()[-800:]
     if not msgs and (code==0 or 'IndexError' in out):hint='该时间范围内没有消息，请把时间范围调大后重试'
     return self.send({'ok':ok,'code':code,'file':file.name if file else None,'head':head,'messages':msgs,'speakers':speakers,'count':len(msgs),'text':md,'hint':hint,'live':True,'account':online_account()})
    if self.path=='/api/ack' and role=='h5':return self.send(state.store.ack(v))
    if self.path=='/api/desktop-control' and role=='h5':
     if not isinstance(v,dict) or set(v)!={'visible'} or type(v['visible']) is not bool:raise ValueError('visible_boolean_required')
     if not state.presence or time.monotonic()-state.presence>=8:return self.send({'error':'desktop_offline'},409)
     command={'id':secrets.token_hex(16),'visible':v['visible']}
     state.desktop_command={**command,'expires':time.monotonic()+15}
     return self.send({'command_id':command['id'],'status':'waiting-desktop'},202)
    if self.path=='/api/presence' and role=='desktop':
     if v!={} and (not isinstance(v,dict) or set(v)!={'visible','applied'} or type(v['visible']) is not bool or (v['applied'] is not None and (not isinstance(v['applied'],str) or not re.fullmatch(r'[a-f0-9]{32}',v['applied'])))):raise ValueError('invalid_presence')
     state.presence=time.monotonic()
     if v:
      state.desktop_visible=v['visible'];state.desktop_applied=v['applied']
      if state.desktop_command and v['applied']==state.desktop_command['id']:state.desktop_command=None
     if state.desktop_command and state.desktop_command['expires']<time.monotonic():state.desktop_command=None
     return self.send({'ok':True,'command':{k:v for k,v in state.desktop_command.items() if k!='expires'} if state.desktop_command else None})
    if self.path in ['/api/capture','/api/fetch']:
     if not isinstance(v,dict) or set(v)!={'request_id','source_id','days'} or v['source_id']!='synthetic-group' or type(v['days']) is not int or not 1<=v['days']<=7:raise ValueError('capture_scope')
     # UUID request_id is stable across retries. Generated content/time is deterministic for that request.
     try:
      existing=state.store.get(v['request_id'])
      if existing['event']['source_type']!='synthetic_capture' or existing['event']['source_id']!='synthetic-group:days='+str(v['days']):raise FileExistsError('request_conflict')
      return self.send(existing,202)
     except KeyError:pass
     return self.send(state.store.submit({'schema':SCHEMA,'event_id':v['request_id'],'source_type':'synthetic_capture','source_id':'synthetic-group:days='+str(v['days']),'name':'虚构群消息示例','captured_at':now(),'occurred_at':None,'content':{'kind':'text','text':'【虚构消息】这是一份用于验证桌面投递链路的参考资料，不创建人物或正式事项。'}}),202)
    if self.path in ['/api/revoke','/api/stop']:
     if v!={}:raise ValueError('empty_object_required')
     state.revoked=True;state.tokens={'desktop':'','h5':'','manager':state.tokens['manager']};state.write_auth();self.send({'ok':True,'pending_retained':True})
     if self.path=='/api/stop':threading.Thread(target=self.server.shutdown,daemon=True).start()
     return
    self.send({'error':'not_found_or_forbidden'},404)
   except FileExistsError:self.send({'error':'immutable_id_conflict'},409)
   except KeyError:self.send({'error':'not_found'},404)
   except (ValueError,TypeError,UnicodeError):self.send({'error':'invalid_input'},400)
   except subprocess.TimeoutExpired:self.send({'error':'capture_timeout_retry'},504)
   except OSError:self.send({'error':'capture_unavailable'},503)
   except sqlite3.Error:self.send({'error':'storage_failure_retry_same_id'},503)
 server=LoopbackHTTPServer(('127.0.0.1',port),H);server.daemon_threads=True;server.state=state
 state.origin=f'http://127.0.0.1:{server.server_port}';state.write_auth()
 return server

def default_folder():return Path(os.environ.get('LOCALAPPDATA',str(Path(__file__).parent)))/'小王M1.1运行数据'
def main():
 p=argparse.ArgumentParser();p.add_argument('--data-dir',type=Path,default=default_folder());p.add_argument('--port',type=int,default=8915);p.add_argument('--html',type=Path,default=Path(__file__).resolve().parents[1]/'小王M1.1_桌面联动.html');a=p.parse_args()
 if not a.html.is_file():p.error('主HTML不存在，请先构建')
 try:server=create_server(a.data_dir,a.html,a.port)
 except OSError:p.exit(1,'服务无法绑定指定端口或写入运行目录；请检查是否已启动。\n')
 print('小王交接服务已启动；仅用户主动提供资料和虚构消息。',flush=True);print('本机页面：'+server.state.origin+'/小王.html',flush=True);print('使用悬浮入口打开已配对页面；Ctrl+C关闭，未接收记录保留。',flush=True)
 try:server.serve_forever()
 except KeyboardInterrupt:pass
 finally:server.server_close()
if __name__=='__main__':main()
