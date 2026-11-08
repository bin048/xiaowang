'use strict';
/* 评委材料截图：隔离临时目录 + 虚构资料 + 本地模型桩，不触碰真实运行数据。 */
const {chromium,_electron}=require('playwright'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert'),{spawn}=require('child_process'),{Outbox}=require('../Electron悬浮入口/transport');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xw-shots-')),out=path.join(root,'文档','截图'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync(out,{recursive:true});
let service,browser,app;
(async()=>{try{
 service=spawn('python3',[path.join(root,'Windows本地服务/本地投递服务.py'),'--data-dir',dir,'--port','18932']);service.stderr.on('data',d=>console.error(String(d)));let auth;
 for(let i=0;i<80;i++){try{auth=JSON.parse(fs.readFileSync(path.join(dir,'本机配对.json')));if((await fetch(auth.origin+'/health')).ok)break}catch{}await sleep(100)}assert(auth,'服务未就绪');
 const req=async(endpoint,body,role='desktop')=>{const r=await fetch(auth.origin+endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+auth.tokens[role],...(role==='h5'?{Origin:auth.origin,'X-XW-Features':'person-presets-v1'}:{'X-XW-Client':role+'-v1'}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}};
 browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2});
 await ctx.addInitScript(()=>{localStorage.setItem('xiaowang-h5-model-config-v02',JSON.stringify({key:'synthetic-test-key',model:'deepseek-flash',endpoint:'https://api.deepseek.com/chat/completions',remember:true}))});
 await ctx.route('https://**/*',async route=>{if(route.request().url()==='https://api.deepseek.com/chat/completions'){const payload=JSON.parse(JSON.parse(route.request().postData()).messages[1].content);const doc=payload.documents[0];const result={summary:'本周在筹备一场教学方法分享，偏好先给结论再给依据的表达节奏。',dimensions:[{name:'近况',insights:[{label:'正在做的事',value:'筹备教学分享',sourceId:doc.id,quote:doc.content.slice(0,24)}]},{name:'表达偏好',insights:[{label:'沟通风格',value:'先结论后依据',sourceId:doc.id,quote:doc.content.slice(0,24)}]}]};return route.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]})})}return route.abort()});
 const page=await ctx.newPage();page.on('pageerror',e=>console.error('PAGE',e.message));
 await page.goto(auth.origin+'/小王.html#xw_pair='+auth.tokens.h5);await page.waitForFunction(()=>__xw.h5()?.ready);
 const people=await page.evaluate(()=>__xw.presets.people().slice(0,3));assert.equal(people.length,3);
 // 配置三个人物位
 await page.locator('#person-presets summary').click();
 for(let i=0;i<3;i++)await page.locator('[data-preset-slot="'+i+'"]').selectOption(people[i].id);
 await page.getByRole('button',{name:'保存三个人物位并启用自动画像'}).click();
 await page.waitForFunction(()=>document.querySelector('#person-presets').innerText.includes('已保存'));
 // 投递两份正常资料（走画像）+ 一份异常资料（不存在的人物，进入待人工处理）
 const outbox=new Outbox(dir);const set=async slot=>{const p=(await req('/api/presets')).body;const s=p.slots[slot-1];outbox.routing=s?{...s,receiver_id:p.receiver_id,auto_profile:p.auto_profile,model_stamp:p.model_stamp}:null};
 const post=async row=>{const r=await req('/api/deliver',row.event);assert.equal(r.status,202);await page.evaluate(()=>XWDelivery.sync());return row};
 await set(1);const f1=await post(outbox.text('【虚构示例】本周正在准备教学方法分享，喜欢先给结论再给依据。'));
 await page.waitForFunction(eid=>__xw.m1.findDelivery(eid)?.presetProfile?.status==='done',f1.event.event_id,{timeout:20000});
 await set(2);const f2=await post(outbox.text('【虚构示例】整理了一份阅读清单，偏向历史与系统思维类。'));
 await page.waitForFunction(eid=>__xw.m1.findDelivery(eid)?.presetProfile?.status==='done',f2.event.event_id,{timeout:20000});
 const cfg=(await req('/api/presets')).body;outbox.routing={person_id:'deleted-person',person_name:'已删除的示例人物',receiver_id:cfg.receiver_id,auto_profile:true,model_stamp:cfg.model_stamp};
 const bad=await post(outbox.text('【虚构示例】这份资料的目标人物已被删除。'));
 await page.waitForFunction(eid=>!!__xw.m1.findDelivery(eid)?.presetIssue,bad.event.event_id,{timeout:20000});
 const shot=async name=>{await sleep(400);await page.screenshot({path:path.join(out,name)});console.log('SHOT',name)};
 // 1 信息渡口（含人物预设面板与待人工处理）
 await page.evaluate(()=>{document.querySelector('[data-view="intake"]')?.click();const p=document.getElementById('person-presets');if(p)p.open=true;p?.scrollIntoView({block:'start'})});await sleep(600);
 await shot('01-信息渡口-人物预设.png');
 await page.locator('#person-presets').screenshot({path:path.join(out,'01b-人物预设面板.png')});console.log('SHOT 01b-人物预设面板.png');
 // 2 画像视图
 await page.evaluate(v=>{const nav=document.querySelector('[data-view="'+v+'"]');nav&&nav.click()},'profile');await sleep(600);await shot('02-人物画像.png');
 // 3 事项
 await page.evaluate(v=>{document.querySelector('[data-view="'+v+'"]')?.click()},'matters');await sleep(600);await shot('03-事项.png');
 // 4 资料库
 await page.evaluate(v=>{document.querySelector('[data-view="'+v+'"]')?.click()},'library');await sleep(600);await shot('04-资料库.png');
 // 5 关系
 await page.evaluate(v=>{document.querySelector('[data-view="'+v+'"]')?.click()},'relations');await sleep(600);await shot('05-关系.png');
 // 6 秘书
 await page.evaluate(v=>{document.querySelector('[data-view="'+v+'"]')?.click()},'secretary');await sleep(600);await shot('06-秘书.png');
 // 7 真实悬浮球
 try{
  const env={...process.env,XW_DATA_DIR:dir};delete env.ELECTRON_RUN_AS_NODE;
  app=await _electron.launch({executablePath:process.env.XW_TEST_ELECTRON,args:[path.join(root,'Electron悬浮入口'),'--test',...(process.env.XW_TEST_NO_SANDBOX==='1'?['--no-sandbox']:[])],env});
  const win=await app.firstWindow();await win.waitForLoadState('load');await sleep(800);
  await win.screenshot({path:path.join(out,'07-桌面悬浮球.png')});console.log('SHOT 07-桌面悬浮球.png');
 }catch(e){console.error('悬浮球截图跳过:',e.message)}
 console.log('DONE',out);
}catch(e){console.error(e);process.exitCode=1}finally{if(app)await app.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});if(service){service.kill('SIGINT');await new Promise(r=>service.once('exit',r)).catch(()=>{})}}})();
