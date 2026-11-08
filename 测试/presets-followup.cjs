'use strict';
/* 接力补测：入口一步定位、跨浏览器提示、画像中断恢复、跨标签页只生成一次、
   人物删除/提取失败后的待处理提示与人工恢复、模型变化后的重试。全部虚构资料，模型走本地模拟接口。 */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert'),{spawn}=require('child_process'),{Outbox}=require('../Electron悬浮入口/transport');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xw-followup-')),sleep=ms=>new Promise(r=>setTimeout(r,ms));
let service,browser,ctx,page,page2;let modelCalls=0,modelMode='success',acceptNext=false;const results=[];
const MODEL={key:'synthetic-test-key',model:'deepseek-flash',endpoint:'https://api.deepseek.com/chat/completions',remember:true};
async function test(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS',name)}
(async()=>{try{
 service=spawn('python3',[path.join(root,'Windows本地服务/本地投递服务.py'),'--data-dir',dir,'--port','18932'],{stdio:['ignore','pipe','pipe']});service.stderr.on('data',d=>console.error(String(d)));let auth;
 for(let i=0;i<80;i++){try{auth=JSON.parse(fs.readFileSync(path.join(dir,'本机配对.json')));if((await fetch(auth.origin+'/health')).ok)break}catch{}await sleep(100)}assert(auth);
 const req=async(endpoint,body,role='desktop')=>{const r=await fetch(auth.origin+endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+auth.tokens[role],...(role==='h5'?{Origin:auth.origin,'X-XW-Features':'person-presets-v1'}:{'X-XW-Client':role+'-v1'}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}};
 const showPanel=async p=>{await p.evaluate(()=>__xw.show('intake'));await p.waitForSelector('#person-presets');if(!(await p.locator('#person-presets').evaluate(el=>el.open)))await p.locator('#person-presets summary').click()};
 browser=await chromium.launch();ctx=await browser.newContext();
 await ctx.addInitScript(cfg=>{if(!localStorage.getItem('xiaowang-h5-model-config-v02'))localStorage.setItem('xiaowang-h5-model-config-v02',JSON.stringify(cfg))},MODEL);
 await ctx.route('https://**/*',async route=>{if(route.request().url()==='https://api.deepseek.com/chat/completions'){modelCalls++;if(modelMode==='failure')return route.fulfill({status:500,body:'{"error":{"message":"synthetic failure"}}'});const payload=JSON.parse(JSON.parse(route.request().postData()).messages[1].content);const doc=payload.documents[0];const result={summary:'虚构补测画像',dimensions:[{name:'近况',insights:[{label:'补测要点',value:'虚构补测资料已归档',sourceId:doc.id,quote:doc.content.slice(0,18)}]}]};return route.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]})})}return route.abort()});
 page=await ctx.newPage();page.on('pageerror',e=>console.error('PAGE',e.message));
 page.on('dialog',async d=>{if(acceptNext){acceptNext=false;await d.accept()}else{console.error('UNEXPECTED_DIALOG',d.message());await d.dismiss()}});
 await page.goto(auth.origin+'/小王.html#xw_pair='+auth.tokens.h5+'&xw_open=presets');
 await page.waitForFunction(()=>__xw.h5()?.ready);

 await test('悬浮球“设置三个人物位…”深链一次到位：切到信息渡口、展开并滚到人物预设',async()=>{
  await page.waitForFunction(()=>document.getElementById('person-presets')?.open===true,null,{timeout:6000});
  await page.waitForFunction(()=>{const r=document.getElementById('person-presets').getBoundingClientRect();return r.top<innerHeight&&r.bottom>0},null,{timeout:6000});
  assert.equal(await page.evaluate(()=>__xw.view()),'intake');
 });

 const people=await page.evaluate(()=>__xw.presets.people().slice(0,3));assert.equal(people.length,3);
 const slots=async ids=>{for(let i=0;i<3;i++)await page.locator('[data-preset-slot="'+i+'"]').selectOption(ids[i])};
 await slots(people.map(p=>p.id));
 await page.getByRole('button',{name:'保存三个人物位并启用自动画像'}).click();
 await page.waitForFunction(()=>document.querySelector('#person-presets').innerText.includes('已保存'));
 const outbox=new Outbox(dir);const set=async slot=>{const p=(await req('/api/preset-select',{selection:slot})).body;const s=p.slots[slot-1];outbox.routing=s?{...s,receiver_id:p.receiver_id,auto_profile:p.auto_profile,model_stamp:p.model_stamp}:null};
 const post=async row=>{assert.equal((await req('/api/deliver',row.event)).status,202);await page.evaluate(()=>XWDelivery.sync());return row};

 await test('目标人物被删除：显示带文件名的待处理项，不改投，也不阻断另一份正常投递',async()=>{
  const cfg=(await req('/api/presets')).body;
  outbox.routing={person_id:'deleted-person',person_name:'已删除虚构人物',receiver_id:cfg.receiver_id,auto_profile:true,model_stamp:cfg.model_stamp};
  const bad=await post(outbox.fileBytes('虚构不存在人物的资料.txt',Buffer.from('【虚构】目标人物已被删除，这份文件不应改投给其他人。')));
  await page.waitForFunction(eid=>!!__xw.m1.findDelivery(eid)?.presetIssue,bad.event.event_id);
  const source=await page.evaluate(eid=>{const s=__xw.m1.findDelivery(eid);return {owner:s.memory.ownerPersonId,issue:s.presetIssue?.message,archived:!!s.presetArchive}},bad.event.event_id);
  assert.equal(source.owner,null);assert.equal(source.archived,false);assert(/预设人物已删除/.test(source.issue));
  assert.equal((await req('/api/events/'+bad.event.event_id)).body.status,'queued');
  await showPanel(page);
  const panel=await page.locator('#person-presets').innerText();
  assert(/待人工处理 1 份/.test(panel),'待处理块缺失');assert(panel.includes('虚构不存在人物的资料.txt'),'待处理项未显示文件名');
  assert.equal(await page.locator('[data-preset-settle="'+bad.event.event_id+'"]').count(),1);
  await set(1);const good=await post(outbox.text('【虚构】异常文件旁边的一份正常投递'));
  await page.waitForFunction(eid=>__xw.m1.findDelivery(eid)?.presetProfile?.status==='done',good.event.event_id);
  assert.equal(await page.evaluate(eid=>__xw.m1.findDelivery(eid).memory.ownerPersonId,good.event.event_id),people[0].id);
 });

 await test('点“停止自动重试并保留在渡口”：事件变为已接收、资料仍留存、未改投、提示消失',async()=>{
  const eid=(await page.evaluate(()=>__xw.h5().sources.find(s=>s.presetIssue)?.delivery.event.event_id));assert(eid);
  await showPanel(page);acceptNext=true;await page.locator('[data-preset-settle="'+eid+'"]').click();
  await page.waitForFunction(id=>!__xw.m1.findDelivery(id).presetIssue,eid,{timeout:8000});
  assert.equal((await req('/api/events/'+eid)).body.status,'received');
  const after=await page.evaluate(id=>{const s=__xw.m1.findDelivery(id);return {owner:s.memory.ownerPersonId,archived:!!s.presetArchive,text:s.text.slice(0,6)}},eid);
  assert.equal(after.owner,null);assert.equal(after.archived,false);assert(after.text.includes('虚构'));
  await showPanel(page);await sleep(300);
  assert.equal(await page.locator('[data-preset-settle="'+eid+'"]').count(),0,'停止重试后仍显示待处理');
 });

 await test('正文提取失败：不自动归档，给出待处理提示且原件保留',async()=>{
  await set(2);
  const bad=await post(outbox.fileBytes('虚构损坏文件.pdf',Buffer.from('%PDF-1.4\n% synthetic broken pdf, no body\n')));
  await page.waitForFunction(eid=>!!__xw.m1.findDelivery(eid)?.presetIssue,bad.event.event_id,{timeout:10000});
  const s=await page.evaluate(eid=>{const x=__xw.m1.findDelivery(eid);return {parse:x.parseStatus,owner:x.memory.ownerPersonId,issue:x.presetIssue?.message}},bad.event.event_id);
  assert.equal(s.parse,'failed');assert.equal(s.owner,null);assert(/未完整提取|提取失败/.test(s.issue));
  assert.equal((await req('/api/events/'+bad.event.event_id)).body.status,'queued');
  acceptNext=true;await showPanel(page);await page.locator('[data-preset-settle="'+bad.event.event_id+'"]').click();
  await page.waitForFunction(id=>!__xw.m1.findDelivery(id).presetIssue,bad.event.event_id,{timeout:8000});
 });

 await test('模型目标变化后重试被拒绝；重新保存预设再重试成功并更新 modelStamp',async()=>{
  modelMode='failure';await set(3);
  const row=await post(outbox.text('【虚构】模型变化补测资料'));
  await page.waitForFunction(eid=>__xw.m1.findDelivery(eid)?.presetProfile?.status==='failed',row.event.event_id,{timeout:15000});
  const before=await page.evaluate(eid=>__xw.m1.findDelivery(eid).presetProfile.modelStamp,row.event.event_id);
  const calls=modelCalls;
  await page.evaluate(cfg=>localStorage.setItem('xiaowang-h5-model-config-v02',JSON.stringify({...cfg,model:'deepseek-flash-0715'})),MODEL);
  await page.reload();await page.waitForFunction(()=>__xw.h5()?.ready);await showPanel(page);await sleep(1200);
  const stamp=await page.evaluate(()=>__xw.presets.model().stamp);
  assert.notEqual(stamp,before,'模型戳未变化，测试前提不成立');
  modelMode='success';
  await page.locator('[data-preset-retry="'+row.event.event_id+'"]').click();
  await page.waitForFunction(()=>document.querySelector('#person-presets').innerText.includes('请先保存当前模型的人物预设'),null,{timeout:4000});
  assert.equal(await page.evaluate(eid=>__xw.m1.findDelivery(eid).presetProfile.status,row.event.event_id),'failed','未保存预设就重试成功，属于静默换模型');
  assert.equal(modelCalls,calls,'被拒绝的重试仍调用了模型');
  await showPanel(page);await page.getByRole('button',{name:'保存三个人物位并启用自动画像'}).click();
  await page.waitForFunction(()=>document.querySelector('#person-presets').innerText.includes('已保存'));
  await page.locator('[data-preset-retry="'+row.event.event_id+'"]').click();
  await page.waitForFunction(eid=>__xw.m1.findDelivery(eid)?.presetProfile?.status==='done',row.event.event_id,{timeout:15000});
  const now=await page.evaluate(eid=>__xw.m1.findDelivery(eid).presetProfile,row.event.event_id);
  assert.equal(now.modelStamp,stamp);assert.equal(modelCalls,calls+1);
 });

 await test('页面中途关闭（running 但无人持有锁）时自动恢复画像，不需手工点重试',async()=>{
  const eid=await page.evaluate(()=>__xw.h5().sources.find(s=>s.presetProfile?.status==='done')?.delivery.event.event_id);assert(eid);
  const calls=modelCalls;
  await page.evaluate(async id=>{await __xw.m1.profileStatus(id,'running')},eid);
  await page.waitForFunction(id=>__xw.m1.findDelivery(id)?.presetProfile?.status==='done',eid,{timeout:15000});
  assert.equal(modelCalls,calls+1,'中断的画像没有重新生成');
  const st=await page.evaluate(id=>__xw.m1.findDelivery(id).presetProfile.status,eid);assert.equal(st,'done');
 });

 await test('两个标签页同时收到同一投递，只生成一次画像',async()=>{
  await showPanel(page);
  page2=await ctx.newPage();page2.on('pageerror',e=>console.error('PAGE2',e.message));
  page2.on('dialog',async d=>{await d.dismiss()});
  await page2.goto(auth.origin+'/小王.html#xw_pair='+auth.tokens.h5);
  await page2.waitForFunction(()=>__xw.h5()?.ready);await sleep(800);
  const cfg=(await req('/api/presets')).body;const slot=cfg.slots[0];
  outbox.routing={...slot,receiver_id:cfg.receiver_id,auto_profile:true,model_stamp:cfg.model_stamp};
  const calls=modelCalls;
  const row=outbox.text('【虚构】两个标签页同时接收的资料');
  assert.equal((await req('/api/deliver',row.event)).status,202);
  await page.evaluate(()=>XWDelivery.sync()).catch(()=>{});
  await page2.evaluate(()=>XWDelivery.sync()).catch(()=>{});
  try{
   await page.waitForFunction(eid=>__xw.m1.findDelivery(eid)?.presetProfile?.status==='done',row.event.event_id,{timeout:20000});
  }catch(e){
   const dump=async p=>({delivery:await p.evaluate(()=>XWDelivery.status()),src:await p.evaluate(id=>{const s=__xw.m1.findDelivery(id);return s?{archive:s.presetArchive,profile:s.presetProfile,issue:s.presetIssue,owner:s.memory?.ownerPersonId}:null},row.event.event_id)});
   console.error('CROSSTAB_DIAGNOSTIC',JSON.stringify({p1:await dump(page),p2:await dump(page2),server:(await req('/api/events/'+row.event.event_id)).body.status,modelCalls}));
   throw e;
  }
  await sleep(2500);
  assert.equal(modelCalls,calls+1,'同一份资料生成了多次画像');
  assert.equal((await req('/api/events/'+row.event.event_id)).body.status,'received');
 });

 await test('换浏览器（receiver 不同）时保存人物位会先确认，取消则不覆盖原配置',async()=>{
  const before=(await req('/api/presets')).body;
  const fresh=await browser.newContext();const p3=await fresh.newPage();
  p3.on('dialog',async d=>await d.dismiss());
  await p3.goto(auth.origin+'/小王.html#xw_pair='+auth.tokens.h5);await p3.waitForFunction(()=>__xw.h5()?.ready);await showPanel(p3);await sleep(1200);
  const warned=await p3.locator('#person-presets').innerText();
  assert(/不是同一份浏览器资料/.test(warned),'未提示跨浏览器数据边界');
  for(let i=0;i<3;i++){const opts=await p3.locator('[data-preset-slot="'+i+'"] option').count();assert(opts>1);await p3.locator('[data-preset-slot="'+i+'"]').selectOption({index:1})}
  await p3.getByRole('button',{name:'保存三个人物位并启用自动画像'}).click();
  await sleep(500);
  assert.deepEqual((await req('/api/presets')).body,before,'取消确认后仍覆盖了原配置');
  await fresh.close();
 });

 await page.locator('#person-presets summary').click();
 }finally{if(browser)await browser.close();if(service){service.kill('SIGINT');await new Promise(r=>service.once('exit',r))}fs.writeFileSync(path.join(root,'文档/接力补测_测试结果.json'),JSON.stringify({platform:process.platform,modelMocked:true,externalModelCalled:false,results},null,2))}})().catch(e=>{console.error(e);process.exitCode=1});
