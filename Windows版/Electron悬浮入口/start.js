'use strict';
const {spawn}=require('node:child_process'),path=require('node:path');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
let executable;try{executable=require('electron')}catch{console.error('请先在本目录执行 npm install 和 npx install-electron，详见启动说明。');process.exit(1)}
const child=spawn(executable,[__dirname,...process.argv.slice(2)],{env,stdio:'inherit'});
child.on('error',()=>{console.error('Electron无法启动；待投递记录保留。');process.exit(1)});child.on('exit',code=>process.exit(code||0));
