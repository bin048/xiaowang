'use strict';
const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('entryAPI',{
 submitText:text=>ipcRenderer.invoke('entry:text',text),
 submitFile:file=>{const filePath=webUtils.getPathForFile(file);if(!filePath)return Promise.reject(Error('请拖入本机实际文件'));return ipcRenderer.invoke('entry:file',filePath)},
 state:()=>ipcRenderer.invoke('entry:state'),menu:()=>ipcRenderer.invoke('entry:menu'),open:()=>ipcRenderer.invoke('entry:open'),retry:()=>ipcRenderer.invoke('entry:retry'),dragStart:p=>ipcRenderer.invoke('entry:drag-start',p),dragMove:p=>ipcRenderer.invoke('entry:drag-move',p),dragEnd:()=>ipcRenderer.invoke('entry:drag-end'),
 onState:cb=>{const handler=(_e,state)=>cb(state);ipcRenderer.on('entry:state',handler);return()=>ipcRenderer.removeListener('entry:state',handler)}
});
