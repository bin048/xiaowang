'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('assert');const {Outbox,hash}=require('../Electron悬浮入口/transport');
const dir=fs.mkdtempSync(path.join(require('os').tmpdir(),'xw-outbox-'));fs.writeFileSync(path.join(dir,'本机配对.json'),JSON.stringify({origin:'http://127.0.0.1:1',tokens:{desktop:'synthetic-only-test-token'}}));const results=[];
(async()=>{
const q=new Outbox(dir,async()=>{throw Error('synthetic timeout')});const row=q.text('虚构待投递资料');await q.sync(true);const reopened=new Outbox(dir);assert.equal(reopened.rows[0].event.event_id,row.event.event_id);assert.equal(reopened.rows[0].receipt,null);assert(reopened.rows[0].last_error.includes('未连接'));results.push({name:'发送失败后重开保留文本和原事件ID',status:'PASS'});
try{await q.capture()}catch{}const id=JSON.parse(fs.readFileSync(path.join(dir,'虚构采集请求.json'))).request_id;let observed;
const q2=new Outbox(dir,async(url,options)=>{observed=JSON.parse(options.body).request_id;const e={schema:'xiaowang.delivery.event.v1',event_id:observed,source_type:'synthetic_capture',source_id:'synthetic-group:days=2',name:'虚构测试',captured_at:new Date().toISOString(),occurred_at:null,content:{kind:'text',text:'虚构测试'}};return {ok:true,json:async()=>({event:e,payload_hash:hash(e),status:'queued',receipt:null})}});await q2.capture();assert.equal(id,observed);assert(!fs.existsSync(path.join(dir,'虚构采集请求.json')));assert(q2.rows.some(r=>r.event.event_id===id));results.push({name:'虚构采集请求响应丢失后，重开复用同一请求ID',status:'PASS'});
fs.writeFileSync(path.join(dir,'入口待投递.json'),'invalid-synthetic-json');assert.throws(()=>new Outbox(dir));assert.equal(fs.readFileSync(path.join(dir,'入口待投递.json'),'utf8'),'invalid-synthetic-json');results.push({name:'损坏待投递记录拒绝加载，未覆盖原文',status:'PASS'});
fs.writeFileSync(path.join(__dirname,'入口恢复单元测试.json'),JSON.stringify({results},null,2));console.log(results)
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>fs.rmSync(dir,{recursive:true,force:true}))
