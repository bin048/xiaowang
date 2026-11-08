"""Real SQLite connections retained strongly to make lifetime bugs deterministic."""
import concurrent.futures, gc, importlib.util, json, platform, sqlite3, tempfile, threading, unittest, uuid
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('resource_delivery',ROOT/'Windows本地服务/本地投递服务.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def event(i=0):
 return dict(schema=m.SCHEMA,event_id=str(uuid.uuid4()),source_type='shared_text',source_id='synthetic-resource-'+str(i),name='虚构资源测试',captured_at=m.now(),occurred_at=None,content={'kind':'text','text':'相同的虚构正文'})
def receipt(row):
 return dict(receipt_id=str(uuid.uuid4()),event_id=row['event']['event_id'],payload_hash=row['payload_hash'],source_record_id='evt-'+row['event']['event_id'],receiver_id='synthetic-resource-test',received_at=m.now(),extraction_status='text')

class ResourceTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.connections=[];self.active=0;self.peak=0;self.lock=threading.Lock();self.fail_pragma=False
  parent=self;original=sqlite3.connect
  class Tracked(sqlite3.Connection):
   def __init__(self,*a,**kw):
    kw["check_same_thread"]=False # Test-only: teardown may inspect retained handles from worker threads.
    super().__init__(*a,**kw);self.closed=False
    with parent.lock:parent.connections.append(self);parent.active+=1;parent.peak=max(parent.peak,parent.active)
   def close(self):
    if self.closed:return
    super().close()
    with parent.lock:
     if not self.closed:self.closed=True;parent.active-=1
   def execute(self,sql,*a,**kw):
    if parent.fail_pragma and sql.startswith('PRAGMA synchronous'):raise sqlite3.OperationalError('synthetic setup failure')
    return super().execute(sql,*a,**kw)
  self.mock=patch.object(m.sqlite3,'connect',lambda *a,**kw:original(*a,factory=Tracked,**kw));self.mock.start();self.gc_enabled=gc.isenabled();gc.disable()
 def tearDown(self):
  self.mock.stop()
  for c in self.connections:c.close()
  if self.gc_enabled:gc.enable()
  self.tmp.cleanup()
 def released(self):
  self.assertEqual(self.active,0)
  for c in self.connections[-20:]:
   with self.assertRaises(sqlite3.ProgrammingError):c.execute('SELECT 1')
 def test_normal_return_exception_commit_and_rollback(self):
  s=m.Store(self.tmp.name);self.released()
  with s.connect() as db:db.execute('CREATE TABLE probe(value TEXT)');db.execute("INSERT INTO probe VALUES('committed')")
  self.released()
  with self.assertRaisesRegex(RuntimeError,'synthetic rollback'):
   with s.connect() as db:db.execute("INSERT INTO probe VALUES('rolled-back')");raise RuntimeError('synthetic rollback')
  self.released()
  with s.connect() as db:self.assertEqual([r[0] for r in db.execute('SELECT value FROM probe')],['committed'])
  self.released()
 def test_connection_setup_failure_also_closes(self):
  s=m.Store(self.tmp.name);self.released();self.fail_pragma=True
  with self.assertRaisesRegex(sqlite3.OperationalError,'synthetic setup failure'):
   with s.connect():pass
  self.released()
 def test_continuous_delivery_retries_receipts_and_conflicts(self):
  s=m.Store(self.tmp.name)
  for i in range(400):
   e=event(i);row=s.submit(e)
   for _ in range(3):self.assertEqual(s.submit(e),row)
   ack=receipt(row);self.assertEqual(s.ack(ack),s.ack(ack));self.assertEqual(s.get(e['event_id'])['receipt'],ack)
   bad={**e,'content':{'kind':'text','text':'different'}}
   with self.assertRaises(FileExistsError):s.submit(bad)
   with self.assertRaises(FileExistsError):s.ack({**ack,'receipt_id':str(uuid.uuid4())})
   with self.assertRaises(KeyError):s.attachment(e['event_id'])
   self.assertEqual(s.pending(),[]);self.assertEqual(s.counts(),{'received':i+1});self.released()
  self.assertGreater(len(self.connections),4000);self.assertEqual(self.peak,1)
  print(json.dumps({'case':'continuous','events':400,'connections_opened':len(self.connections),'active_after':self.active,'peak_active':self.peak}))
 def test_concurrent_retries_and_restart_preserve_identity(self):
  s=m.Store(self.tmp.name);events=[event(i) for i in range(80)]
  def worker(e):
   row=s.submit(e)
   for _ in range(4):self.assertEqual(s.submit(e)['payload_hash'],row['payload_hash'])
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(worker,events))
  self.released();self.assertEqual(s.counts(),{'queued':80})
  reopened=m.Store(self.tmp.name)
  for e in events:self.assertEqual(reopened.get(e['event_id'])['event'],e)
  self.released();self.assertLessEqual(self.peak,4)
  # Windows fails these operations if SQLite handles remain open.
  p=s.path;new=p.with_name('释放后可重命名.sqlite3');p.rename(new);new.rename(p)
  print(json.dumps({'case':'concurrent','events':80,'connections_opened':len(self.connections),'active_after':self.active,'peak_active':self.peak,'rename_passed':True,'platform':platform.system()}))
if __name__=='__main__':unittest.main(verbosity=2)
