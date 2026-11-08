'use strict';
/* A最终版窗口/唯一SVG形象的最小接收适配。无人物库、无AI、无归档数据库。 */
const {app,BrowserWindow,ipcMain,Menu,Tray,nativeImage,screen,dialog,shell}=require('electron');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');const {spawn}=require('node:child_process');const {Outbox,atomicWrite}=require('./transport');
const DIR=path.resolve(process.env.XW_DATA_DIR||path.join(process.env.LOCALAPPDATA||app.getPath('userData'),'小王M1.1运行数据'));
fs.mkdirSync(DIR,{recursive:true});app.setPath('userData',path.join(DIR,'Electron窗口数据'));
let pet=null,composer=null,tray=null,interval=null,dragTimer=null,queue=null,quitting=false,nativeError='',desktopApplied=null,syncing=false,presets={slots:[null,null,null],selection:0};
if(!app.requestSingleInstanceLock()){app.quit()}else{app.on('second-instance',()=>{showPet()});app.whenReady().then(start).catch(e=>{dialog.showErrorBox('小王入口未启动',e.message);app.quit()})}
const page=n=>path.join(__dirname,n);
function trusted(event){const url=event.senderFrame?.url;return [require('node:url').pathToFileURL(page('pet.html')).href,require('node:url').pathToFileURL(page('composer.html')).href].includes(url)}
function handle(name,fn){ipcMain.handle(name,async(e,...args)=>{if(!trusted(e))throw Error('未知窗口请求');return fn(...args)})}
function secureWindow(opts,file){const w=new BrowserWindow({...opts,webPreferences:{preload:page('preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,devTools:process.argv.includes('--test')}});w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());w.loadFile(page(file));return w}
function broadcast(){const rows=queue.summary(),pending=queue.rows.filter(r=>r.status!=='received').length;const state={rows,pending,error:nativeError,mode:presets.selection?'归档到：'+(presets.slots[presets.selection-1]?.person_name||'未配置'):'普通模式 · 手动确认'};pet?.webContents.send('entry:state',state);composer?.webContents.send('entry:state',state);return state}
function showPet(){if(!pet||pet.isDestroyed())return;const area=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;const {width,height}=pet.getBounds();pet.setPosition(area.x+Math.max(0,area.width-width-24),area.y+Math.max(0,Math.round((area.height-height)/2)));pet.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});pet.setAlwaysOnTop(true,'floating');pet.show();pet.moveTop();pet.focus()}
async function sync(force=false){if(syncing)return;syncing=true;try{await loadPresets();const presence=await queue.request('/api/presence','POST',{visible:!!pet?.isVisible(),applied:desktopApplied});if(presence.command){if(presence.command.visible)showPet();else pet?.hide();desktopApplied=presence.command.id;await queue.request('/api/presence','POST',{visible:!!pet?.isVisible(),applied:desktopApplied})}nativeError='';await queue.sync(force)}catch(e){nativeError=e.message;try{await queue.sync(force)}catch(error){nativeError=error.message}}finally{syncing=false;broadcast()}}
/* 打开已配对的小王页面；focus='presets' 时带 xw_open，让页面一步展开人物预设。 */
function h5Url(focus){const a=queue.auth();if(!a.tokens.h5)throw Error('配对已撤销');return a.origin+'/小王.html#xw_pair='+encodeURIComponent(a.tokens.h5)+(focus==='presets'?'&xw_open=presets':'')}
/* 小王的主入口是本机「小王语料」应用：悬浮球点“打开小王”就是启动它；只有本机没装应用时才退回浏览器页面。 */
function appBundle(){const list=[process.env.XW_APP_BUNDLE,'/Applications/小王语料.app',path.join(app.getPath('home'),'Applications/小王语料.app')].filter(Boolean);for(const p of list){try{if(fs.existsSync(p))return p}catch{}}return null}
function launchApp(bundle){return new Promise(resolve=>{if(process.platform!=='darwin')return resolve(false);let child;try{child=spawn('/usr/bin/open',['-a',bundle],{stdio:'ignore',detached:true})}catch{return resolve(false)}child.once('error',()=>resolve(false));child.once('exit',code=>resolve(code===0))})}
async function openXiaowang(focus){const bundle=appBundle();if(bundle&&await launchApp(bundle)){nativeError='';return 'app'}try{await shell.openExternal(h5Url(focus));return 'web'}catch(e){nativeError='没有找到「小王语料」应用，本地服务也未连接；已保存的待投递资料仍保留';broadcast();return ''}}
const openH5=openXiaowang;
function openComposer(){if(composer&&!composer.isDestroyed()){composer.show();return}composer=secureWindow({width:520,height:440,resizable:true,title:'小王 · 投递一段文本',backgroundColor:'#191d31'},'composer.html');composer.on('closed',()=>composer=null);composer.webContents.on('did-finish-load',broadcast)}
function pickFiles(){dialog.showOpenDialog(pet,{properties:['openFile','multiSelections'],filters:[{name:'资料',extensions:['docx','pdf','pptx','txt','md','csv']}]}).then(async({canceled,filePaths})=>{if(canceled)return;for(const f of filePaths){try{await addFile(f)}catch(e){nativeError=e.message}}broadcast();void sync(true)})}
async function loadPresets(){try{presets=await queue.request('/api/presets')}catch(e){try{presets=JSON.parse(fs.readFileSync(path.join(DIR,'人物预设.json'),'utf8'))}catch{presets={slots:[null,null,null],selection:0}}}const slot=presets.slots[presets.selection-1];queue.routing=slot?{...slot,receiver_id:presets.receiver_id,auto_profile:presets.auto_profile,model_stamp:presets.model_stamp}:null}
async function selectPreset(selection){try{presets=await queue.request('/api/preset-select','POST',{selection});await loadPresets();nativeError='';broadcast()}catch(e){nativeError=e.message;broadcast()}}
async function addFile(file){await loadPresets();const fd=fs.openSync(file,'r');try{const stat=fs.fstatSync(fd);if(!stat.isFile()||stat.size>15*1024*1024)throw Error('仅接收15MB内普通文件');const data=fs.readFileSync(fd);return queue.fileBytes(path.basename(file),data,'application/octet-stream','local-file:'+crypto.createHash('sha256').update(path.resolve(file)).digest('hex'))}finally{fs.closeSync(fd)}}
function menu(){Menu.buildFromTemplate([{label:'普通模式 · 手动确认',type:'checkbox',checked:presets.selection===0,click:()=>void selectPreset(0)},...presets.slots.map((slot,i)=>({label:slot?'归档到 '+slot.person_name:'人物位 '+(i+1)+'（未配置，点“设置三个人物位…”）',type:'checkbox',checked:presets.selection===i+1,enabled:!!slot,click:()=>void selectPreset(i+1)})),{label:'设置三个人物位…（打开小王语料直接定位）',click:()=>void openXiaowang('presets')},{type:'separator'},{label:'投递一段文本',click:openComposer},{label:'选择文件投递',click:pickFiles},{label:'获取虚构消息示例',click:async()=>{try{await queue.capture();nativeError='';void sync(true)}catch(e){nativeError=e.message;broadcast()}}},{type:'separator'},{label:'打开小王（小王语料 App）',click:()=>void openXiaowang()},{label:'重试待投递资料',click:()=>void sync(true)},{label:'隐藏悬浮球（托盘可唤回）',click:()=>pet.hide()},{label:'退出悬浮入口',click:()=>app.quit()}]).popup({window:pet})}
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function trayIcon() {
  const W = 16, H = 16;
  const px = (x, y, r, g, b, a) => {
    const i = y * (W * 4 + 1) + 1 + x * 4;
    raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
  };
  const raw = Buffer.alloc((W * 4 + 1) * H, 0);
  // 托盘图标与桌面上的桌宠是同一个形象：暖白团子 + 蓝面罩 + 单侧天线
  const C = { shell:[244,247,255], shade:[198,212,236], rim:[255,255,255],
              screen:[22,34,74], eye:[99,188,255], lamp:[234,248,255],
              metal:[173,195,230], line:[47,64,110] };
  for (let x = 4; x <= 11; x++) px(x, 15, ...C.line, 90);          // 柔影
  px(11, 0, ...C.lamp, 255); px(10, 1, ...C.metal, 255); px(10, 2, ...C.metal, 255); // 偏右天线 + 灯
  px(1, 7, ...C.metal, 255); px(1, 8, ...C.metal, 255); px(1, 9, ...C.metal, 255);  // 左侧单枚耳片
  const rows = {3:[5,10],4:[3,12],5:[2,13],6:[2,13],7:[2,13],8:[2,13],9:[2,13],10:[2,13],11:[2,13],12:[3,12],13:[5,10]};
  Object.keys(rows).forEach((y)=>{
    const [a,b] = rows[y];
    for (let x = a; x <= b; x++) {
      const edge = (y === 3 || y === 13 || x === a || x === b);
      px(x, y, ...(edge ? C.rim : (y >= 11 ? C.shade : C.shell)), 255);
    }
  });
  for (let y = 6; y <= 10; y++) for (let x = 4; x <= 11; x++) {
    if ((y === 6 || y === 10) && (x === 4 || x === 11)) continue;
    px(x, y, ...C.screen, 255);
  }
  px(5, 8, ...C.eye, 255); px(6, 8, ...C.eye, 255);                 // 两道笑眼
  px(9, 8, ...C.eye, 255); px(10, 8, ...C.eye, 255);
  px(7, 10, ...C.eye, 255); px(8, 10, ...C.eye, 255);                // 小光点嘴
  px(7, 12, ...C.metal, 255); px(8, 12, ...C.metal, 255);            // 方形铭牌
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
  return nativeImage.createFromBuffer(png).resize({ width: 16, height: 16 });
}

function start(){
 queue=new Outbox(DIR);const area=screen.getPrimaryDisplay().workArea;let pos={x:area.x+area.width-220,y:area.y+area.height-270};try{pos={...pos,...JSON.parse(fs.readFileSync(path.join(DIR,'悬浮位置.json'),'utf8'))}}catch{}const displays=screen.getAllDisplays();if(!displays.some(d=>pos.x>=d.workArea.x&&pos.y>=d.workArea.y&&pos.x+190<=d.workArea.x+d.workArea.width&&pos.y+220<=d.workArea.y+d.workArea.height))pos={x:area.x+area.width-220,y:area.y+area.height-270};
 pet=secureWindow({...pos,width:190,height:226,frame:false,transparent:true,alwaysOnTop:true,resizable:false,skipTaskbar:true,hasShadow:false,title:'小王 · 系统悬浮入口'},'pet.html');pet.setAlwaysOnTop(true,'floating');pet.on('move',()=>{if(pet&&!pet.isDestroyed()){const {x,y}=pet.getBounds();atomicWrite(path.join(DIR,'悬浮位置.json'),{x,y})}});pet.on('closed',()=>{pet=null;if(!quitting)app.quit()});pet.webContents.on('did-finish-load',broadcast);
 const icon=trayIcon();
 tray=new Tray(icon.isEmpty()?nativeImage.createEmpty():icon);tray.setToolTip('小王资料入口');tray.on('click',showPet);tray.setContextMenu(Menu.buildFromTemplate([{label:'显示悬浮球',click:showPet},{label:'打开小王（小王语料 App）',click:()=>void openXiaowang()},{label:'退出悬浮入口',click:()=>app.quit()}]));
 handle('entry:text',async text=>{await loadPresets();const r=queue.text(text);broadcast();void sync(true);return {event_id:r.event.event_id,status:'waiting-service'}});handle('entry:file',async file=>{const r=await addFile(file);broadcast();void sync(true);return {event_id:r.event.event_id,status:'waiting-service'}});handle('entry:state',broadcast);handle('entry:menu',menu);handle('entry:open',openH5);handle('entry:retry',()=>sync(true));
 let dragState=null;const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<100000&&Math.abs(p.y)<100000;
 handle('entry:drag-start',p=>{if(!point(p))return;dragState={point:p,bounds:pet.getBounds()}});
 handle('entry:drag-move',p=>{if(!dragState||!point(p))return;pet.setPosition(Math.round(dragState.bounds.x+p.x-dragState.point.x),Math.round(dragState.bounds.y+p.y-dragState.point.y))});
 handle('entry:drag-end',()=>{dragState=null});

 interval=setInterval(()=>{if(fs.existsSync(path.join(DIR,'停止悬浮.flag'))){fs.rmSync(path.join(DIR,'停止悬浮.flag'),{force:true});app.quit();return}void sync()},2000);void sync();
 if(process.argv.includes('--test'))globalThis.XWEntryTest={getWindow:()=>pet,getQueue:()=>queue,getPresets:()=>presets,selectPreset,openComposer,addFile,sync,h5Url,openH5,openXiaowang,appBundle,launchApp,hide:()=>pet.hide(),show:()=>pet.show(),dir:DIR};
}
app.on('activate',()=>showPet());
app.on('before-quit',()=>{quitting=true;clearInterval(interval);clearInterval(dragTimer);tray?.destroy()});app.on('window-all-closed',()=>app.quit());
