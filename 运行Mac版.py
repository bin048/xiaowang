"""Local debug launcher. Reuses the existing Mac preview data, no business data migration."""
import argparse,json,os,subprocess,sys,time,urllib.request,webbrowser
from pathlib import Path
ROOT=Path(__file__).resolve().parent
WORK=ROOT.parents[1]/'work'
def call(auth,endpoint,role='desktop',body=None):
 headers={'Authorization':'Bearer '+auth['tokens'][role],'X-XW-Client':role+'-v1'}
 if body is not None:headers['Content-Type']='application/json'
 req=urllib.request.Request(auth['origin']+endpoint,data=json.dumps(body).encode() if body is not None else None,headers=headers)
 with urllib.request.urlopen(req,timeout=3) as response:return json.load(response)
def app_bundle():
 """小王的主入口是本机「小王语料」应用；没装应用时才退回浏览器页面。"""
 for p in (os.environ.get('XW_APP_BUNDLE'),'/Applications/小王语料.app',str(Path.home()/'Applications/小王语料.app')):
  if p and Path(p).exists():return p
 return None
def main():
 p=argparse.ArgumentParser();p.add_argument('--data-dir',type=Path,default=WORK/'m11-preview');p.add_argument('--no-browser',action='store_true');p.add_argument('--stop',action='store_true');args=p.parse_args()
 folder=args.data_dir.resolve();folder.mkdir(parents=True,exist_ok=True);pair=folder/'本机配对.json'
 if args.stop:
  (folder/'停止悬浮.flag').write_text('stop')
  try:call(json.loads(pair.read_text()),'/api/stop','manager',{})
  except Exception:print('本地服务已关闭或未连接。')
  return
 executable=Path(os.environ.get('XW_ELECTRON',str(WORK/'m11-runtime/electron-dist/Electron.app/Contents/MacOS/Electron'))).resolve()
 if not executable.is_file():raise RuntimeError('未找到本机 Electron；请通过 XW_ELECTRON 指定已安装的官方 Electron 程序。')
 status=None;auth=None
 if pair.is_file():
  try:auth=json.loads(pair.read_text());status=call(auth,'/api/status')
  except Exception:pass
 if status and not status.get('desktop_launchable'):
  call(auth,'/api/stop','manager',{});time.sleep(.5);status=None
 if not status:
  log=open(folder/'本地服务运行.log','ab')
  try:child=subprocess.Popen([sys.executable,str(ROOT/'Windows本地服务/本地投递服务.py'),'--data-dir',str(folder),'--port','8915','--desktop-executable',str(executable),'--desktop-entry',str(ROOT/'Electron悬浮入口')],stdin=subprocess.DEVNULL,stdout=log,stderr=log,start_new_session=True)
  finally:log.close()
  for _ in range(100):
   if child.poll() is not None:raise RuntimeError('服务启动失败，请查看本地服务运行.log；没有切换到其他端口。')
   try:
    auth=json.loads(pair.read_text());status=call(auth,'/api/status')
    if status.get('desktop_launchable'):break
   except Exception:pass
   time.sleep(.1)
  else:raise RuntimeError('服务启动超时')
 def show_desktop():
  req=urllib.request.Request(auth['origin']+'/api/desktop-control',data=b'{"visible":true}',headers={'Authorization':'Bearer '+auth['tokens']['h5'],'Origin':auth['origin'],'Content-Type':'application/json'})
  with urllib.request.urlopen(req,timeout=5) as response:json.load(response)
 def desktop_ready(seconds):
  deadline=time.monotonic()+seconds
  while time.monotonic()<deadline:
   try:
    if call(auth,'/api/status').get('desktop_available'):return True
   except Exception:pass
   time.sleep(.3)
  return False
 # Ask the fixed service launcher directly inside this trusted local process.
 # The same authenticated H5 endpoint is used, with the matching local origin.
 show_desktop()
 if not desktop_ready(6):
  # 上一次悬浮球没有正常退出时它会占住单实例锁，新进程会立刻退出：先让它退出再拉一次。
  print('悬浮球未上线，正在重启入口…')
  (folder/'停止悬浮.flag').write_text('stop')
  time.sleep(2.5)
  try:show_desktop()
  except Exception:pass
  desktop_ready(8)
 bundle=app_bundle();opened=False
 if bundle and not args.no_browser:
  opened=subprocess.call(['open','-a',bundle])==0
 if not opened and not args.no_browser:webbrowser.open(auth['origin']+'/小王.html#xw_pair='+auth['tokens']['h5'])
 print('小王 Mac 调试版已启动（'+(Path(bundle).name if bundle and opened else '浏览器页面')+'）；退出悬浮球后可从页面重新启动。')
if __name__=='__main__':
 try:main()
 except Exception as e:print('启动未完成：'+str(e));sys.exit(1)
