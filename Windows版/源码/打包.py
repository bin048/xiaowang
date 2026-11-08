from pathlib import Path
import zipfile,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
folders={'源码','文档','测试','Windows本地服务','Electron悬浮入口','Windows验收工具'}
root_files={'小王M1.1_桌面联动.html','开始阅读.md','启动联动.py','一键启动.cmd','安装悬浮依赖.cmd','关闭全部.cmd','仅关闭本地服务.cmd'}
excluded={'__pycache__','node_modules','小王M1.1运行数据','Electron窗口数据','.git','Cache','Code Cache','本机配对.json','入口待投递.json','虚构采集请求.json','停止悬浮.flag','运行数据','待回传证据','浏览器依赖','测试依赖','.DS_Store'}
def allowed(p):
 rel=p.relative_to(ROOT)
 return (rel.parts[0] in folders or len(rel.parts)==1 and rel.name in root_files) and not any(x in excluded for x in rel.parts) and p.suffix.lower() not in {'.pyc','.sqlite3','.db','.wal','.zip','.exe','.dmg'}
files=sorted(p for p in ROOT.rglob('*') if p.is_file() and allowed(p))
manifest=[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
(ROOT/'交付文件校验.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
archive=ROOT.parent/'小王M1.1_Windows基础链路待验收包.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in files+[ROOT/'交付文件校验.json']:
  info=zipfile.ZipInfo(str(Path(ROOT.name)/p.relative_to(ROOT)),date_time=(2026,11,7,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,p.read_bytes())
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for row in manifest:assert hashlib.sha256(z.read(ROOT.name+'/'+row['path'])).hexdigest()==row['sha256']
print(archive.name,len(files)+1,'files',archive.stat().st_size,'bytes',hashlib.sha256(archive.read_bytes()).hexdigest())
