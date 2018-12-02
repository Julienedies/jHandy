/**
 * Created by j on 18/5/22.
 */

const electron = require('electron');
const remote = electron.remote;
const shell = electron.shell;
const BrowserWindow = electron.remote.BrowserWindow;
const ipc = electron.ipcRenderer;

const capture_ocr = require('../../libs/capture-ocr.js');
const bw = require('../../libs/window.js');
const tdx = require('../../libs/tdx.js');
const stockQuery = require('../../libs/stock-query.js');
const voice = require('../../js/libs/voice.js');

// activate context menu
const debugMenu = require('debug-menu');
debugMenu.install();

console.log(`mainWindow start at ${(new Date).toLocaleString()}`);
voice('初始化.');

require('./main-ctrl.js');

require('./help-ctrl.js');

require('./voice-warning-ctrl.js');

require('./count-ctrl.js');

const view_stock = require('./view-stock-ctrl.js');

const rtsc = require('./real-time-stock-ctrl.js');


// 接收主进程发来的消息
ipc.on('view_in_tdx', function (event, msg) {
    let code = msg.code;
    if(!/^\d{6}$/.test(code)){
        let stock = stockQuery(code);
        code = stock.code;
    }
    code && tdx.view(code);
});

//
ipc.on('view_stock_info', function (event, stock) {
    if(stock.code){
        view_stock(stock.code);
    } else {
        capture_ocr( stock => {
            view_stock(stock.code);
        });
    }
});

//
ipc.on('set_stock_c', function (event, stock) {
    if(stock.code){
        bw({
            width:1200,
            height:700,
            x:1800,
            y:300,
            webPreferences:{
                nodeIntegration:false  // 远程页面窗口不整合node,  避免jquery等外部类库因为require变量错判执行环境,导致加载错误.
            },
            url:`http://localhost:2018/public/static/html/stock/c/index.html?code=${stock.code}&edit=1`,
            on_close: function(){
                console.info('on close!');
                tdx.active();
            }
        })
    }else{
        capture_ocr( stock => {

        });
    }
});

//
ipc.on('rts_db_monitor', function (event, stock) {
    if(stock.code){
        rtsc.on_rts_db_monitor(stock);
    }else{
        capture_ocr( stock => {
            rtsc.on_rts_db_monitor(stock);
        });
    }
});

//
ipc.on('rts_cancel', function (event, arg) {
    rtsc.on_rts_cancel(arg);
});


