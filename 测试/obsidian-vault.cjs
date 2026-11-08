'use strict';
/* 验证 Obsidian 知识库导出：结构、双链闭环、zip 可解压。 */
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(0,eval)(fs.readFileSync(path.join(root,'源码/obsidian-vault.js'),'utf8'));
const api=globalThis.XWObsidian;
assert(api,'未挂载 XWObsidian');

const roster=api.roster();
assert.strictEqual(roster.length,20,'名册应有 20 人，实际 '+roster.length);
assert.strictEqual(new Set(roster.map(p=>p.name)).size,20,'人物姓名必须唯一');
for(const p of roster){
 assert(p.name&&p.role&&p.desc,'人物资料不完整：'+p.name);
 assert(p.meta&&p.meta.school&&p.meta.major,'缺少学校/专业：'+p.name);
 assert(p.facts.length>=3,'档案信息过少：'+p.name);
 assert(p.docs.length>=1,'缺少语料：'+p.name);
}
console.log('PASS 名册 20 人，字段齐全');

// 回归：历史数据 updatedAt/createdAt 可能是毫秒时间戳（数字），曾导致导出抛 slice is not a function。
{
 const legacy=[{id:'x1',name:'测试旧数据',role:'',relation:'',desc:'',tags:[],demo:false,
  createdAt:1730000000000,updatedAt:1730500000000,docs:[],facts:[]}];
 const r=api.build(legacy);
 const note=r.files.find(f=>f.path===r.root+'/人物/测试旧数据.md');
 assert(note,'数字时间戳人物应生成笔记');
 assert(/更新: 20\d\d-\d\d-\d\d/.test(note.text),'数字时间戳应转成日期：'+note.text.split('\n').find(l=>l.startsWith('更新:')));
 console.log('PASS 数字时间戳兼容（更新: '+note.text.split('\n').find(l=>l.startsWith('更新:')).slice(4)+'）');
}

const {files,stats,root:vaultRoot}=api.build(roster);
assert.strictEqual(vaultRoot,'小王知识库','顶层文件夹名不对');
assert(files.every(f=>f.path.startsWith(vaultRoot+'/')),'所有文件都应在这个顶层文件夹里，解压后可直接整只拖进 Obsidian');
assert(files.length>80,'导出文件过少：'+files.length);
const byPath=new Map(files.map(f=>[f.path,f.text]));
for(const f of files)assert(f.text&&f.text.includes('\n'),'空文件：'+f.path);

// 每个笔记都要有 frontmatter
for(const f of files.filter(f=>f.path.endsWith('.md')&&f.path!==vaultRoot+'/README.md')){
 assert(f.text.startsWith('---\n'),'缺少 frontmatter：'+f.path);
 assert(f.text.includes('\ntype')===false,'字段名不应是英文 type');
}

// 人名笔记齐全
for(const p of roster){
 const rel=vaultRoot+'/人物/'+p.name+'.md';
 assert(byPath.has(rel),'缺少人物笔记：'+rel);
 const t=byPath.get(rel);
 assert(t.includes('# '+p.name),'人物笔记缺标题：'+rel);
 assert(t.includes('## 关系网络'),'缺少关系网络：'+rel);
 assert(t.includes('## 教育经历'),'缺少教育经历：'+rel);
}

// 双链闭环：[[x|y]] / [[x]] 的 x 必须是某个笔记的文件名（不含目录、不含扩展名）
const names=new Set(files.filter(f=>f.path.endsWith('.md')).map(f=>path.basename(f.path,'.md')));
let links=0;const broken=new Set();
for(const f of files.filter(f=>f.path.endsWith('.md'))){
 for(const m of f.text.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)){
  links++;const target=m[1];
  if(!names.has(target))broken.add(target+' ← '+f.path);
 }
}
assert.strictEqual(broken.size,0,'存在断链：\n'+[...broken].slice(0,8).join('\n'));
console.log('PASS 文件 '+files.length+' 篇，双链 '+links+' 条全部可解析');

// 反向：A 提到 B，B 也要提到 A
for(const p of roster){
 const t=byPath.get(vaultRoot+'/人物/'+p.name+'.md');
 for(const other of roster){
  if(other===p)continue;
  if(t.includes('[['+other.name+']]')){
   const back=byPath.get(vaultRoot+'/人物/'+other.name+'.md');
   assert(back.includes('[['+p.name+']]'),'关系不是双向的：'+p.name+' → '+other.name);
  }
 }
}
console.log('PASS 人物关系双向闭环');

// 画布
const canvas=JSON.parse(byPath.get(vaultRoot+'/关系画布.canvas'));
assert(canvas.nodes.length>=20&&canvas.edges.length>=20,'画布节点/边过少');
for(const e of canvas.edges){
 assert(canvas.nodes.some(n=>n.id===e.fromNode)&&canvas.nodes.some(n=>n.id===e.toNode),'画布边的端点不是节点');
}
console.log('PASS 关系画布 '+canvas.nodes.length+' 节点 / '+canvas.edges.length+' 边');

// zip 结构与可解压
const bytes=api.zip(files);
assert(bytes[0]===0x50&&bytes[1]===0x4b,'zip 头不对');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xw-vault-'));
const zipPath=path.join(dir,'小王知识库.zip');
fs.writeFileSync(zipPath,Buffer.from(bytes));
const test=cp.spawnSync('unzip',['-tq',zipPath],{encoding:'utf8'});
assert.strictEqual(test.status,0,'unzip -t 失败：'+(test.stderr||test.stdout));
// 解压验证用 ditto（libarchive，等同 Finder 双击解压）；Apple 自带 unzip 6.00 会忽略 UTF-8 标志位，不作为判据
const out=path.join(dir,'out');fs.mkdirSync(out);
const ex=cp.spawnSync('ditto',['-x','-k',zipPath,out],{encoding:'utf8'});
assert.strictEqual(ex.status,0,'解压失败：'+(ex.stderr||ex.stdout));
const unzipped=cp.spawnSync('find',[out,'-name','*.md'],{encoding:'utf8'}).stdout.trim().split('\n').filter(Boolean);
assert(unzipped.length===files.filter(f=>f.path.endsWith('.md')).length,'解压后的 md 数量不一致：'+unzipped.length);
const sample=fs.readFileSync(path.join(out,vaultRoot,'人物','沈知行.md'),'utf8');
assert(sample.includes('[[清华大学]]'),'解压后人物笔记内容不对');
assert(fs.existsSync(path.join(out,vaultRoot,'关系画布.canvas')),'解压后缺画布');
const tops=fs.readdirSync(out);
assert.deepStrictEqual(tops,[vaultRoot],'解压后应该只有一个顶层文件夹，实际：'+tops.join(','));
console.log('PASS zip 可解压：'+unzipped.length+' 篇 md + 画布，中文路径正常，大小 '+bytes.length+' 字节');
console.log('统计：'+JSON.stringify(stats));
console.log('临时目录：'+dir);
