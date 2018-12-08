/**
 * Created by j on 18/5/21.
 * electron 主进程
 */

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;

const path = require('path');

const electron = require('electron');
const app = electron.app;
const ipcMain = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;
const globalShortcut = electron.globalShortcut;

const ac = require('./libs/ac.js');
const tdx = require('./libs/tdx.js');

const server = require('./server/server.js');

// 保持一个对于 window 对象的全局引用，如果你不这样做，
// 当 JavaScript 对象被垃圾回收， window 会被自动地关闭
let mainWindow;

// 创建主窗口，一个渲染进程
function createWindow() {

    var windowOptions = {
        width: 1360,
        minWidth: 1360,
        height: 820,
        x: 0,
        y: 0,
        title: app.getName()
    };

    mainWindow = new BrowserWindow(windowOptions);
    mainWindow.loadURL(path.join('file://', __dirname, '/index.html'));
    mainWindow.webContents.openDevTools();
    mainWindow.maximize();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function ready() {

    let {sw, sh} = electron.screen.getPrimaryDisplay().workAreaSize;
    console.info(sw, sh);

    createWindow();

    electron.powerMonitor.on('resume', () => {
        let d = new Date();
        let h = d.getHours();
        if (h > 5 && h < 10) { // 只在早上重启
            app.relaunch();
            app.exit();
        }
    });

    // 鼠标手势  => 快捷键 =>  apple script获取通达信个股代码  => 在浏览器打开同花顺个股资料页面
    globalShortcut.register('CommandOrControl+Alt+x', function () {
        ac.getStockName(function (stock) {
            mainWindow.webContents.send('view_stock_info', stock);
        });
    });

    // 鼠标手势 => 快捷键 =>  apple script获取通达信个股代码  => 个股资料编辑
    globalShortcut.register('CommandOrControl+Alt+b', function () {
        ac.getStockName(function (stock) {
            mainWindow.webContents.send('set_stock_c', stock);
        });
    });

    // 鼠标手势 => 快捷键 =>  apple script获取通达信个股代码  => 打板封单监控
    globalShortcut.register('CommandOrControl+Alt+z', function () {
        ac.getStockName(function (stock) {
            mainWindow.webContents.send('rts_db_monitor', stock);
        });
    });

    // 打板封单监控数据 => socket.io => 浏览器页面 http://192.168.3.20:3000/
    ipcMain.on('rts_push', (event, stocks) => {
        server.push(stocks);
    });

    // 浏览器页面 http://192.168.3.20:3000/  => socket.io => 取消个股打板封单监控
    server.on('rts_cancel', function (msg) {
        mainWindow.webContents.send('rts_cancel', msg.code);
    });

    // 淘股吧页面 => chrome扩展 => socket.io => 在通达信显示个股
    server.on('view_in_tdx', function (msg) {
        // 在render进程中执行tdx.view(), 貌似不会因为事件tick迟滞;
        mainWindow.webContents.send('view_in_tdx', msg);
    });

    // 淘股吧页面 => chrome扩展 => socket.io => 在通达信显示个股
    server.on('view_in_ftnn', function (msg) {
        // 在render进程中执行tdx.view(), 貌似不会因为事件tick迟滞;
        mainWindow.webContents.send('view_in_ftnn', msg);
    });

    // 同花顺个股资料页面 => chrome扩展 => socket.io => 激活富途牛牛
    server.on('active_ftnn', function (msg) {
        ac.activeFtnn();
        ac.activeTdx();
    });

}

// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.on('ready', ready);

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用及其菜单栏会保持激活。
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (mainWindow === null) {
        ready();
    }
});

