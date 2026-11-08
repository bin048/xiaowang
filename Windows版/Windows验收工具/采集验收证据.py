"""Run on Windows only. Read this package's synthetic test directory, never personal browser data."""
import argparse,hashlib,json,os,platform,sqlite3,subprocess,sys,urllib.request
from contextlib import closing
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];KIT=Path(__file__).resolve().parent;DATA=KIT/'运行数据';OUT=KIT/'待回传证据'
def collect(stage):
 if sys.platform!='win32':raise RuntimeError('仅可在Windows真机执行；不会生成伪Windows运行证据。')
 report={'stage':stage,'utc':datetime.now(timezone.utc).isoformat(),'platform':platform.platform(),'windows_build':platform.version(),'synthetic_data_directory_only':True,'collector_pid':os.getpid(),'collector_parent_pid':os.getppid()}
 ps="""$root=$env:XW_EVIDENCE_ROOT; $rows=@(Get-CimInstance Win32_Process | Where-Object { ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($root,[System.StringComparison]::OrdinalIgnoreCase)) -or ($_.CommandLine -and $_.CommandLine.IndexOf($root,[System.StringComparison]::OrdinalIgnoreCase) -ge 0) } | ForEach-Object { [pscustomobject]@{pid=$_.ProcessId;parent_pid=$_.ParentProcessId;name=$_.Name;scope='this-test-package'} }); ConvertTo-Json -InputObject $rows -Compress"""
 try:report['package_processes']=json.loads(subprocess.check_output(['powershell.exe','-NoProfile','-Command',ps],env=dict(os.environ,XW_EVIDENCE_ROOT=str(ROOT)),text=True,encoding='utf-8',errors='replace'))
 except Exception as e:report['process_inspection_error']=type(e).__name__;report['process_inspection_complete']=False
 try:
  a=json.loads((DATA/'本机配对.json').read_text(encoding='utf-8'));req=urllib.request.Request(a['origin']+'/api/status',headers={'Authorization':'Bearer '+a['tokens']['desktop'],'X-XW-Client':'desktop-v1'})
  with urllib.request.urlopen(req,timeout=3) as r:report['service']=json.load(r)
 except Exception as e:report['service']={'reachable':False,'error_type':type(e).__name__}
 dbpath=DATA/'投递队列.sqlite3';events=[]
 if dbpath.exists():
  with closing(sqlite3.connect(dbpath.resolve().as_uri()+'?mode=ro',uri=True,timeout=3)) as db:
   for eid,h,raw,status,accepted,ack in db.execute('SELECT event_id,payload_hash,event_json,status,accepted_at,receipt_json FROM deliveries ORDER BY accepted_at,event_id'):
    e=json.loads(raw);c=e['content'];events.append({'event_id':eid,'payload_hash':h,'source_type':e['source_type'],'source_id':e['source_id'],'name':e['name'],'content_kind':c['kind'],'content_digest':hashlib.sha256(c.get('text','').encode()).hexdigest() if c['kind']=='text' else c['sha256'],'status':status,'accepted_at':accepted,'receipt':json.loads(ack) if ack else None})
 report['events']=events
 outbox=DATA/'入口待投递.json'
 if outbox.exists():
  try:
   raw=json.loads(outbox.read_text(encoding='utf-8'));rows=raw if isinstance(raw,list) else raw.get('rows',[])
   report['outbox']=[{'event_id':r['event']['event_id'],'status':r.get('status'),'receipt':r.get('receipt')} for r in rows]
  except Exception as e:report['outbox_error']=type(e).__name__
 OUT.mkdir(exist_ok=True);dest=OUT/(datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'_'+stage+'.json');dest.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('已写入待回传证据/'+dest.name+'；此日志不等同于人工验收通过。')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('stage',choices=['started','queued','received','service-stopped','restarted','all-stopped']);args=p.parse_args();collect(args.stage)
