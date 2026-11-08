'use strict';
const {_electron}=require('playwright'),path=require('path'),os=require('os'),fs=require('fs');
const root=path.resolve(__dirname,'..');
const exe=process.env.XW_TEST_ELECTRON;
const extra=process.argv.slice(2);
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xw-probe-'));
 const env={...process.env,XW_DATA_DIR:dir};delete env.ELECTRON_RUN_AS_NODE;
 try{
  const app=await _electron.launch({executablePath:exe,args:[path.join(root,'Electron悬浮入口'),'--test',...extra],env,timeout:30000});
  const w=await app.firstWindow({timeout:15000});
  console.log('PROBE_OK',await w.title(),JSON.stringify(extra));
  await app.close();
 }catch(e){console.log('PROBE_FAIL',JSON.stringify(extra),String(e.message).split('\n')[0]);process.exitCode=1}
})();
