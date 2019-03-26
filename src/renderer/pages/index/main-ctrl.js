/**
 * Created by j on 18/8/21.
 */

import $ from 'jquery'
import brick from '@julienedies/brick'

import '@fortawesome/fontawesome-free/css/all.css'
import 'froala-editor/css/froala_editor.pkgd.css'
import 'froala-editor/css/froala_style.min.css'
import 'froala-editor/js/froala_editor.pkgd.min.js'

import utils from '../../../libs/utils'
import Win from '../../../libs/window'

brick.services.reg('viewsModel', () => {
    const list = []
    let activeItem
    return {
        get (isActiveItem) {
            return isActiveItem ? activeItem : list;
        },
        add (item) {
            if (!this.has(item)) {
                list.push(item)
                this.active(item)
            }
        },
        remove (item) {
            let index = this.getIndex(item)
            item = this.find(item)
            if (item) {
                if (activeItem === item) {
                    let nextItem = list[index + 1] || list[0]
                    nextItem && this.active(nextItem)
                }
                item.$webView.remove()
                list.splice(index, 1)
            }
        },
        has (item) {
            return this.getIndex(item) !== -1
        },
        active (item) {
            item = this.find(item)
            if (activeItem) {
                activeItem.active = false
                activeItem.$webView.hide()
            }
            item.active = true
            item.$webView.show()
            activeItem = item
        },
        getIndex (item) {
            return list.findIndex((v) => {
                return v.url === item.url
            })
        },
        /**
         * 参数里的item只有url属性, 并不等于list里存储的item
         * @param item
         * @returns {null}
         */
        find (item) {
            let index = this.getIndex(item)
            return index !== -1 ? list[index] : null
        }
    }
})

brick.reg('mainCtrl', function (scope) {

        let $elm = this.$elm

        let $viewsWrapper = $('#viewsWrapper')
        let $indexView = $('#indexView')
        let $viewTabs = $('#viewTabs')
        let $views = $('#views')

        const viewsModel = brick.services.get('viewsModel')

        let render = () => {
            let list = viewsModel.get()
            $viewTabs.icRender({model: list})
            if (!list.length) {
                scope.showIndex()
            }
        }

        this.show = function (e, url) {
            $viewsWrapper.show()
            $indexView.hide()
            let $th = $(this)
            let title = $th.text()
            let item = {title, url}
            if (viewsModel.has(item)) {
                viewsModel.active(item)
            } else {
                item.$webView = $(`<webview src="${ url }" nodeintegration style="height: 100%;"></webview>`).appendTo($views)
                viewsModel.add(item)
            }
            render()
        }

        this.closeTab = function (e, url) {
            viewsModel.remove({url})
            render()
            return false
        }

        this.activeTab = (e, url) => {
            viewsModel.active({url})
            render()
        }

        this.showIndex = function (e, url) {
            $indexView.show()
            $viewsWrapper.hide()
        }

        this.reminder = function () {
            let winCtrl = new Win('reminder.html')
            winCtrl.maximize()
        }

        scope.review = function () {
            let win = scope.reviewTradingWindow
            if (win) {
                win.show()
            } else {
                scope.sreviewTradingWindow = utils.open({
                    x: 1440,
                    y: 0,
                    url: 'review.html',
                    onClose: () => {
                        delete scope.reviewTradingWindow;
                    }
                });
                scope.sreviewTradingWindow.maximize()
            }
        }

        scope.viewImg = function () {
            let filePaths = utils.select()
            console.info(filePaths)
            if (!filePaths) return;
            let dir = encodeURIComponent(filePaths[0])
            let url = `viewer.html?dir=${ dir }`
            let viewImgWindow = scope.viewImgWindow
            if (viewImgWindow) {
                viewImgWindow.load(url)
            } else {
                viewImgWindow = scope.viewImgWindow = new Win({
                    x: 1440,
                    url,
                    onClose: () => {
                        delete scope.viewImgWindow
                    }
                });
                viewImgWindow.maximize()
            }
        }

        scope.openCsd = function (e) {
            let csdWindow = scope.csdWindow
            if (csdWindow) {
                csdWindow.show()
            } else {
                scope.csdWindow = utils.open({
                    x: 160, y: 80, url: 'csd.html', onClose: () => {
                        delete scope.csdWindow
                    }
                })
            }
        }

        this.openSetting = function () {
            let settingWindow = scope.settingWindow
            if (settingWindow) {
                settingWindow.show()
            } else {
                scope.settingWindow = new Win({
                    url: 'setting.html', onClose: () => {
                        delete scope.settingWindow
                    }
                })
            }
        }

        scope.news = function () {
            let newsWin = scope.newsWin
            if (newsWin) {
                newsWin.close()
                delete scope.newsWin;
            } else {
                let opt = {
                    width: 10,
                    height: 10,
                    x: 1600,
                    y: 0,
                    //opacity: 0.8,
                    transparent: true,
                    frame: false,
                    hasShadow: false,
                    alwaysOnTop: true,
                    center: true,
                    url: 'news.html'
                }
                newsWin = scope.newsWin = new Win(opt);
                newsWin.win.setIgnoreMouseEvents(true)
                newsWin.win.webContents.on('did-finish-load', function () {
                    newsWin.win.webContents.send('id', newsWin.win.id)
                })
            }
        }

        scope.warn = function () {
            let warnWindow = scope.warnWindow
            if (warnWindow && warnWindow.win) {
                warnWindow.close()
                scope.warnWindow = null
            } else {
                let opt = {
                    width: 480,
                    height: 320,
                    x: 1940,
                    y: 640,
                    show:false,
                    //opacity: 0.9,
                    transparent: true,
                    //titleBarStyle: 'hidden',
                    frame: false,
                    hasShadow: false,
                    alwaysOnTop: true,
                    center: true,
                    url: 'warn.html'
                }
                warnWindow = scope.warnWindow = new Win(opt);
                warnWindow.win.hide()
                warnWindow.win.setIgnoreMouseEvents(true)
                warnWindow.win.webContents.on('did-finish-load', function () {
                    warnWindow.win.webContents.send('id', warnWindow.win.id)
                })
            }
        }

    window.addEventListener('beforeunload', function (e) {
        scope.warnWindow && scope.warnWindow.close()
        scope.newsWin && scope.newsWin.close()
    })
        //---------------------------------
        scope.news()
        scope.warn()
    }
)

brick.reg('memoCtrl', function () {

    let $memo = $('#memo')

    $.get('/stock/memo').done(function (o) {
        let text = o.text

        $memo.froalaEditor({
            toolbarInline: true,
            /*toolbarButtons: ['bold', 'italic', 'underline', 'strikeThrough', 'color', 'emoticons', '-', 'paragraphFormat', 'align', 'formatOL', 'formatUL', 'indent', 'outdent', '-', 'insertImage', 'insertLink', 'insertFile', 'insert'],*/
            // Change save interval (time in miliseconds).
            saveInterval: 2500,
            // Set the save param.
            saveParam: 'text',
            // Set the save URL.
            saveURL: '/stock/memo',
            // HTTP request type.
            saveMethod: 'POST',
            // Additional save params.
            saveParams: {time: +new Date}
        }).froalaEditor('html.set', text || '')

    })

    this.saveMemo = function (e) {
        let text = $memo.froalaEditor('html.get', true)
        console.log(text)
        $.post('/stock/memo', {text}).done((o) => {
        })
    }

})
