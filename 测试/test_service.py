import unittest,importlib.util,threading,http.client,tempfile,json,uuid,hashlib,base64
from pathlib import Path
MODULE=Path(__file__).resolve().parents[1]/'Windows本地服务/本地投递服务.py'
spec=importlib.util.spec_from_file_location('delivery',MODULE);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def event(text='虚构资料',eid=None,source='synthetic-a'):
 return {'schema':m.SCHEMA,'event_id':eid or str(uuid.uuid4()),'source_type':'shared_text','source_id':source,'name':'虚构资料','captured_at':m.now(),'occurred_at':None,'content':{'kind':'text','text':text}}
class TransportTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.html=Path(self.temp.name)/'candidate.html';self.html.write_text('<html>synthetic</html>');self.server=m.create_server(self.temp.name,self.html,0);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start();self.a=self.server.state
 def tearDown(self):self.server.shutdown();self.server.server_close();self.temp.cleanup()
 def req(self,path,method='GET',data=None,role='desktop',origin=None,host=None,token=True):
  h={}
  if token:h['Authorization']='Bearer '+self.a.tokens.get(role,'invalid')
  if role in ['desktop','manager']:h['X-XW-Client']=role+'-v1'
  if role=='h5':h['Origin']=self.a.origin
  if origin is not None:h['Origin']=origin
  if host:h['Host']=host
  if data is not None:h['Content-Type']='application/json'
  c=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=4);c.request(method,path,json.dumps(data).encode() if data is not None else None,h);r=c.getresponse();b=r.read();result=(r.status,dict(r.getheaders()),json.loads(b) if r.getheader('Content-Type','').startswith('application/json') else b);c.close();return result
 def receipt(self,item):return {'receipt_id':str(uuid.uuid4()),'event_id':item['event']['event_id'],'payload_hash':item['payload_hash'],'source_record_id':'evt-'+item['event']['event_id'],'receiver_id':str(uuid.uuid4()),'received_at':m.now(),'extraction_status':'text'}
 def test_same_id_retry_conflict_and_same_body_distinct_events(self):
  e=event();a=self.req('/api/deliver','POST',e);self.assertEqual(a[0],202);self.assertEqual(self.req('/api/deliver','POST',e)[2]['payload_hash'],a[2]['payload_hash']);e['content']['text']='changed';self.assertEqual(self.req('/api/deliver','POST',e)[0],409);self.assertEqual(self.req('/api/deliver','POST',event(source='b'))[0],202);self.assertEqual(len(self.req('/api/pending',role='h5')[2]['deliveries']),2)
 def test_duplicate_bind_does_not_rotate_pairing(self):
  before=self.a.auth_file.read_bytes()
  with self.assertRaises(OSError):m.create_server(self.temp.name,self.html,self.server.server_port)
  self.assertEqual(self.a.auth_file.read_bytes(),before)
 def test_receipt_is_required_and_immutable(self):
  a=self.req('/api/deliver','POST',event())[2];eid=a['event']['event_id'];self.assertEqual(self.req('/api/events/'+eid)[2]['status'],'queued');r=self.receipt(a);self.assertEqual(self.req('/api/ack','POST',r,role='h5')[0],200);self.assertEqual(self.req('/api/ack','POST',r,role='h5')[0],200);r['receipt_id']=str(uuid.uuid4());self.assertEqual(self.req('/api/ack','POST',r,role='h5')[0],409);self.assertEqual(self.req('/api/pending',role='h5')[2]['deliveries'],[])
 def test_disk_reopen_preserves_queue_and_ack(self):
  a=self.req('/api/deliver','POST',event())[2];store=m.Store(self.temp.name);self.assertEqual(store.get(a['event']['event_id'])['status'],'queued');store.ack(self.receipt(a));self.assertEqual(m.Store(self.temp.name).get(a['event']['event_id'])['status'],'received')
 def test_unauthorized_origin_roles_and_host(self):
  for endpoint in ['/api/status','/api/pending','/api/events/'+str(uuid.uuid4())]:self.assertEqual(self.req(endpoint,token=False)[0],401)
  for origin in ['null','https://evil.invalid','http://localhost:8915']:
   r=self.req('/api/pending',role='h5',origin=origin);self.assertEqual(r[0],403);self.assertNotIn('Access-Control-Allow-Origin',r[1])
  self.assertEqual(self.req('/api/status',host='evil.invalid')[0],403);self.assertEqual(self.req('/api/deliver','POST',event(),role='h5')[0],404);self.assertEqual(self.req('/api/ack','POST',{},role='desktop')[0],404)
 def test_file_roundtrip_magic_and_size(self):
  e=event();data=b'%PDF-1.4 synthetic';e['source_type']='shared_file';e['content']={'kind':'file','name':'test.pdf','mime':'application/pdf','size':len(data),'sha256':hashlib.sha256(data).hexdigest(),'base64':base64.b64encode(data).decode()};a=self.req('/api/deliver','POST',e);self.assertEqual(a[0],202);self.assertEqual(self.req('/api/files/'+e['event_id'],role='h5')[2],data);e['event_id']=str(uuid.uuid4());e['content']['name']='../test.pdf';self.assertEqual(self.req('/api/deliver','POST',e)[0],400)
 def test_capture_scope_and_retry(self):
  body={'request_id':str(uuid.uuid4()),'source_id':'synthetic-group','days':2};a=self.req('/api/capture','POST',body);self.assertEqual(a[0],202);self.assertEqual(self.req('/api/capture','POST',body)[2]['payload_hash'],a[2]['payload_hash']);body['days']=3;self.assertEqual(self.req('/api/capture','POST',body)[0],409);body['source_id']='private-chat';self.assertEqual(self.req('/api/capture','POST',body)[0],400)
 def test_revoke_invalidates_both_roles_and_retains_data(self):
  a=self.req('/api/deliver','POST',event())[2];self.assertEqual(self.req('/api/revoke','POST',{},role='h5')[0],200);self.assertEqual(self.req('/api/status')[0],401);self.assertEqual(self.req('/api/pending',role='h5')[0],401);self.assertEqual(self.a.store.get(a['event']['event_id'])['status'],'queued');self.assertTrue(self.a.tokens['manager'])
if __name__=='__main__':unittest.main(verbosity=2)
