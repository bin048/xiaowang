from pathlib import Path
import re,sys,difflib,hashlib
HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
WEB='--web' in sys.argv
APP='--app' in sys.argv   # 打包进 /Applications/小王语料.app 的应用内版：保留原标题，运行期自动识别原生桥
base=(HERE/'baseline.html').read_text();parts=list(re.finditer(r'<script[^>]*>([\s\S]*?)</script>',base));s=base
replacements={1:(HERE/'receiver-ui.js').read_text(),7:(HERE/'processing.js').read_text(),8:(HERE/'app.js').read_text()}
for i in sorted(replacements,reverse=True):
 m=parts[i];prefix='<script>\n'+(HERE/'memory-core.js').read_text()+'\n</script>\n' if i==7 else (
   # 示例人物名册 + Obsidian 导出模块必须早于 app.js 执行（app.js 启动时会补种名册）
   '<script>\n'+(HERE/'obsidian-vault.js').read_text()+'\n</script>\n' if i==8 else '')
 s=s[:m.start()]+prefix+'<script>\n'+replacements[i]+'\n</script>'+s[m.end():]
# web 标记必须早于投递模块执行，因此放在尾部脚本块之前
# 应用内版预置直连信息：安装脚本会把空令牌替换成当前服务令牌
flag=('<script>window.XW_WEB=true;</script>\n' if WEB else
      '<script>window.XW_APP_ORIGIN="http://127.0.0.1:8915";window.XW_APP_TOKEN="";</script>\n' if APP else '')
s=s.replace('</body>',flag+'<script>\n'+(HERE/'presets-ui.js').read_text()+'\n'+(HERE/'delivery-ui.js').read_text()+'\nXWDelivery.start();\n</script>\n</body>')

if WEB:
 s=s.replace('<title>'+'小王 XiaoWang AI · 人物记忆与智能秘书</title>','<title>小王 AI · 人物记忆与智能秘书</title>',1)
 if '<title>小王 AI' not in s: s=s.replace('<title>','<title>小王 AI · ',1)
 s=s.replace('<p class="setting-desc">人物资料与语料保存在本机应用。可随时备份或导入。</p>',
             '<p class="setting-desc">网页版把人物资料与语料保存在<b>当前这台设备的浏览器</b>里，不上传服务器。换设备或换浏览器时，用「导出全部数据」再在新设备「导入 JSON」搬过去。</p>',1)
 s=s.replace('<meta name="theme-color" content="#0a0c11">',
  '<meta name="theme-color" content="#0a0c11">\n'
  '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
  '<meta name="apple-mobile-web-app-title" content="小王">\n'
  '<meta name="mobile-web-app-capable" content="yes">\n'
  '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
  '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">\n'
  '<link rel="manifest" href="manifest.webmanifest">',1)
 s=s.replace('</head>','<style>\n'+(HERE/'web-adapt.css').read_text()+'\n</style>\n</head>',1)
 s=s.replace('</body>','<script>\n/* 离线兜底：仅安全上下文注册（https 或本机），失败不影响主流程 */\nvar __secure=location.protocol==="https:"||["localhost","127.0.0.1"].indexOf(location.hostname)>-1;if("serviceWorker" in navigator&&__secure){addEventListener("load",function(){navigator.serviceWorker.register("./sw.js").catch(function(){})})}\n</script>\n<footer id="xw-web-footer" style="max-width:1180px;margin:0 auto;padding:6px 18px calc(26px + env(safe-area-inset-bottom));color:#7b8494;font-size:12px;line-height:1.8;text-align:center;border-top:1px solid rgba(255,255,255,.06)">网页版 · 资料只保存在当前浏览器，不上传服务器 · <a href="./about.html" style="color:#5b9cff;text-decoration:none">关于这个作品</a> · <a href="https://github.com/bin048/xiaowang" style="color:#5b9cff;text-decoration:none" rel="noreferrer">源码</a></footer>\n</body>',1)
 target=ROOT.parent/'小王网页版/index.html'
else:
 if APP:
  # 本机应用诊断：把原生待处理列表写入本地 localStorage，便于离线核对（不上传、不改数据）
  diag=('<script>\n(function(){if(location.protocol!=="file:")return;'
        'function run(){try{var b=window.XWNativeBridge;if(!b||!b.available())return;'
        'b.request("listImports").then(function(r){try{localStorage.setItem("xw-diag-imports",JSON.stringify(r))}catch(e){}}).catch(function(e){try{localStorage.setItem("xw-diag-imports",JSON.stringify({error:String(e&&e.message||e)}))}catch(_){}})}catch(e){}}'
        'addEventListener("load",function(){setTimeout(run,1200)})})();\n</script>\n')
  s=s.replace('</body>',diag+'</body>',1)
  target=ROOT/'小王M1.1_应用内版.html'
 else:
  s=s.replace('<title>','<title>M1.1 桌面联动 · ',1)
  target=ROOT/'小王M1.1_桌面联动.html'

target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(s)
if not WEB and not APP:
 old=(HERE/'M1.0基线.html').read_text();(ROOT/'文档/实际修改.diff').write_text(''.join(difflib.unified_diff(old.splitlines(True),s.splitlines(True),fromfile='M1.0基线.html',tofile=target.name)))
print(target.name,hashlib.sha256(target.read_bytes()).hexdigest())
