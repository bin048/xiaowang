from pathlib import Path
import re,difflib,hashlib
HERE=Path(__file__).resolve().parent
base=(HERE/'baseline.html').read_text();parts=list(re.finditer(r'<script[^>]*>([\s\S]*?)</script>',base));s=base
replacements={1:(HERE/'receiver-ui.js').read_text(),7:(HERE/'processing.js').read_text(),8:(HERE/'app.js').read_text()}
for i in sorted(replacements,reverse=True):
 m=parts[i];prefix='<script>\n'+(HERE/'memory-core.js').read_text()+'\n</script>\n' if i==7 else ''
 s=s[:m.start()]+prefix+'<script>\n'+replacements[i]+'\n</script>'+s[m.end():]
s=s.replace('<title>','<title>M1.1 桌面联动 · ',1)
s=s.replace('</body>','<script>\n'+(HERE/'presets-ui.js').read_text()+'\n'+(HERE/'delivery-ui.js').read_text()+'\nXWDelivery.start();\n</script>\n</body>')
target=HERE.parent/'小王M1.1_桌面联动.html';target.write_text(s)
old=(HERE/'M1.0基线.html').read_text();(HERE.parent/'文档/实际修改.diff').write_text(''.join(difflib.unified_diff(old.splitlines(True),s.splitlines(True),fromfile='M1.0基线.html',tofile=target.name)))
print(target.name,hashlib.sha256(target.read_bytes()).hexdigest())
