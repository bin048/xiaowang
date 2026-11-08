'use strict';
/* 验证悬浮球“设置三个人物位…”这一入口拼出的地址：普通打开不带 xw_open，设置入口带 xw_open=presets。 */
const {_electron}=require('playwright'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert'),{spawn}=require('child_process');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xw-entry-')),sleep=ms=>new Promise(r=>setTimeout(r,ms));
let service,app;
(async()=>{try{
 service=spawn('python3',[path.join(root,'Windows本地服务/本地投递服务.py'),'--data-dir',dir,'--port','18933'],{stdio:['ignore','pipe','pipe']});
 let auth;for(let i=0;i<80;i++){try{auth=JSON.parse(fs.readFileSync(path.join(dir,'本机配对.json')));if((await fetch(auth.origin+'/health')).ok)break}catch{}await sleep(100)}assert(auth);
 const env={...process.env,XW_DATA_DIR:dir};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath:process.env.XW_TEST_ELECTRON,args:[path.join(root,'Electron悬浮入口'),'--test',...(process.env.XW_TEST_NO_SANDBOX==='1'?['--no-sandbox']:[])],env});await app.firstWindow();
 const plain=await app.evaluate(()=>XWEntryTest.h5Url());const deep=await app.evaluate(()=>XWEntryTest.h5Url('presets'));
 assert(plain.startsWith(auth.origin+'/小王.html#xw_pair='),'普通入口地址异常：'+plain);
 assert(!plain.includes('xw_open'),'普通入口不应带 xw_open');
 assert(deep===plain+'&xw_open=presets','设置入口地址异常：'+deep);
 console.log('PASS 悬浮球设置入口地址带 xw_open=presets，普通打开不带');
}finally{if(app)await app.close();if(service){service.kill('SIGINT');await new Promise(r=>service.once('exit',r))}}})().catch(e=>{console.error(e);process.exitCode=1});
