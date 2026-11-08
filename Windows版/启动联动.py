"""User-launched process supervisor. No system installation or autostart."""
import argparse,json,os,shutil,subprocess,sys,time,urllib.request,webbrowser
from pathlib import Path
ROOT=Path(__file__).resolve().parent
DEFAULT=Path(os.environ.get('LOCALAPPDATA',str(ROOT)))/'小王M1.1运行数据'
def auth(folder):return json.loads((folder/'本机配对.json').read_text(encoding='utf-8'))
def request(a,path,role='desktop',body=None):
 h={'Authorization':'Bearer '+a['tokens'][role],'X-XW-Client':role+'-v1'}
 if body is not None:h['Content-Type']='application/json'
 req=urllib.request.Request(a['origin']+path,data=json.dumps(body).encode() if body is not None else None,headers=h)
 with urllib.request.urlopen(req,timeout=3) as r:return json.load(r)
def stop(folder,ball=True,service=True):
 if ball:folder.mkdir(parents=True,exist_ok=True);(folder/'停止悬浮.flag').write_text('stop',encoding='utf-8')
 if service:
  try:request(auth(folder),'/api/stop','manager',{})
  except Exception:print('服务已关闭或无法联系；如服务终端仍在，请在该终端按Ctrl+C。')
 print('关闭请求已发出；待投递记录保留。')
def note(folder,msg):
 try:
  with open(Path(folder)/'运行日志.txt','a',encoding='utf-8') as f:f.write(time.strftime('%Y-%m-%d %H:%M:%S')+'  '+msg+'\n')
 except Exception:pass

def main():
 p=argparse.ArgumentParser();p.add_argument('--data-dir',type=Path,default=DEFAULT);p.add_argument('--port',type=int,default=8915);p.add_argument('--stop',action='store_true');p.add_argument('--stop-service',action='store_true');p.add_argument('--no-browser',action='store_true');p.add_argument('--service-only',action='store_true');a=p.parse_args();folder=a.data_dir.resolve()
 if a.stop or a.stop_service:return stop(folder,ball=a.stop,service=True)
 folder.mkdir(parents=True,exist_ok=True);(folder/'停止悬浮.flag').unlink(missing_ok=True)
 note(folder,'—— 启动请求 ——')
 running=False

 try:
  current=auth(folder)
  if current.get('revoked'):request(current,'/api/stop','manager',{});time.sleep(.3)
  else:running=request(current,'/api/status')['version']=='1.1'
 except Exception:pass
 if not running:
  command=[sys.executable,str(ROOT/'Windows本地服务/本地投递服务.py'),'--data-dir',str(folder),'--port',str(a.port)]
  service=subprocess.Popen(command,creationflags=subprocess.CREATE_NEW_CONSOLE if os.name=='nt' else 0)
  for _ in range(60):
   if service.poll() is not None:raise RuntimeError('本地服务启动失败，请查看服务终端；未启动第二个替代服务')
   try:
    current=auth(folder)
    if request(current,'/api/status')['version']=='1.1':break
   except Exception:time.sleep(.1)
  else:raise RuntimeError('本地服务启动超时')
 if not a.no_browser:webbrowser.open(current['origin']+'/小王.html#xw_pair='+current['tokens']['h5'])
 if a.service_only:return print('本地服务已就绪。')
 node=os.environ.get('XW_NODE') or shutil.which('node')
 if not node:raise RuntimeError('未找到Node.js；H5和服务已可使用。悬浮入口需Node.js 22.12以上，见说明。')
 version=subprocess.check_output([node,'--version'],text=True).strip().lstrip('v').split('.')
 if tuple(map(int,version[:2]))<(22,12):raise RuntimeError('悬浮入口依赖需要Node.js 22.12以上；H5和服务仍可使用。')
 env=dict(os.environ,XW_DATA_DIR=str(folder));env.pop('ELECTRON_RUN_AS_NODE',None)
 note(folder,'启动悬浮入口 node='+node)
 flags=(subprocess.DETACHED_PROCESS|subprocess.CREATE_NEW_PROCESS_GROUP) if os.name=='nt' else 0
 child=subprocess.Popen([node,str(ROOT/'Electron悬浮入口/start.js')],env=env,cwd=str(ROOT/'Electron悬浮入口'),creationflags=flags,close_fds=True)
 try:early=child.wait(timeout=6)
 except subprocess.TimeoutExpired:early=None
 if early is None:
  print('悬浮入口已启动。关闭入口不会删除待投递记录；停止全部请运行“关闭全部.cmd”。')
  note(folder,'悬浮入口运行中（已脱离控制台）')
  return 0
 if early==0:
  note(folder,'悬浮入口立即退出(0)：已有实例在运行，已请求它显示')
  print('已有一个悬浮入口在运行，已请求它把球显示出来。')
  print('若仍看不到：查看任务栏右下角托盘（可能在 ^ 溢出区），或先运行“关闭全部.cmd”再重开。')
  return 0
 note(folder,'悬浮入口异常退出 code='+str(early))
 print('悬浮入口没能启动（退出码 %s）。日志：%s'%(early,Path(folder)/'运行日志.txt'))
 return 1
if __name__=='__main__':
 try:sys.exit(main() or 0)
 except Exception as e:print('启动未完成：'+str(e));sys.exit(1)
