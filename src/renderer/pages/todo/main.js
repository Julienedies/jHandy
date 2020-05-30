/**
 * Created by j on 18/7/28.
 */

import './index.html'
import '../../css/common/common.scss'
import './style.scss'

import $ from 'jquery'
import brick from '@julienedies/brick'
import '@julienedies/brick/dist/brick.css'

import '../../js/common-stock.js'

brick.reg('todoCtrl', function () {

    let scope = this;
    let $elm = scope.$elm;
    let list = brick.services.get('recordManager')();

    this.onGetTodoDone = function (data) {
        list.init(data);
        scope.render('list', data);
    };

    this.edit = function(e, id) {
        scope.emit('diary.edit', id && list.get(id));
    };

    this.onDelDone = function (data) {
        scope.onGetDiaryDone(data);
    };

    scope.on('diary.edit.done', function (e, data) {
        scope.onGetDiaryDone(data);
    });

});


