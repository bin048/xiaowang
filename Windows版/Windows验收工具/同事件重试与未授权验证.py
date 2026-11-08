"""Requires an already manually submitted synthetic text in the dedicated Windows test queue."""
import json,sqlite3,sys,urllib.request,urllib.error
from pathlib import Path
from contextlib import closing
D=Path(__file__).resolve().parent/'运行数据'
def post(a,path,headers,payload):
 r=urllib.request.Request(a['origin']+path,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json',**headers},method='POST')
 try:
  with urllib.request.urlopen(r,timeout=4) as res:return res.status,json.load(res)
 except urllib.error.HTTPError as e:
  with e:return e.code,json.load(e)
def main():
 if sys.platform!='win32':raise RuntimeError('只在Windows真机执行此验收脚本。')
 a=json.loads((D/'本机配对.json').read_text(encoding='utf-8'));dbpath=D/'投递队列.sqlite3'
 with closing(sqlite3.connect(dbpath.resolve().as_uri()+'?mode=ro',uri=True)) as db:
  items=db.execute('SELECT event_json FROM deliveries ORDER BY accepted_at').fetchall();e=next((json.loads(r[0]) for r in items if json.loads(r[0])['content']['kind']=='text'),None);before=db.execute('SELECT COUNT(*) FROM deliveries').fetchone()[0]
 if not e:raise RuntimeError('请先从真实悬浮球手动投递虚构文本。')
 headers={'Authorization':'Bearer '+a['tokens']['desktop'],'X-XW-Client':'desktop-v1'}
 for _ in range(3):
  code,reply=post(a,'/api/deliver',headers,e);assert code==202 and reply['event']['event_id']==e['event_id']
 with closing(sqlite3.connect(dbpath.resolve().as_uri()+'?mode=ro',uri=True)) as db:after=db.execute('SELECT COUNT(*) FROM deliveries').fetchone()[0]
 assert before==after,'事件重试后队列数量发生变化'
 for path in ['/api/pending','/api/files/'+e['event_id']]:
  req=urllib.request.Request(a['origin']+path,headers={'Origin':'https://unauthorized.invalid'})
  try:urllib.request.urlopen(req,timeout=4);raise AssertionError('未授权读取竟然成功')
  except urllib.error.HTTPError as err:
   with err:assert err.code==403 and 'Access-Control-Allow-Origin' not in err.headers
 code,_=post(a,'/api/capture',{'Origin':'https://unauthorized.invalid'},{'request_id':e['event_id'],'source_id':'private-chat','days':2});assert code==403
 output={'same_event_id':e['event_id'],'retry_requests':3,'before':before,'after':after,'same_event_queue_idempotent':True,'unauthorized_origin_rejected':True,'scope':'HTTP protocol only; physical desktop actions and H5 dedupe require checklist evidence'}
 out=D.parent/'待回传证据';out.mkdir(exist_ok=True);(out/'重试与未授权接口验证.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8');print('同事件重试与未授权接口检查通过。H5数量与Windows物理操作仍需人工核对。')
if __name__=='__main__':main()
