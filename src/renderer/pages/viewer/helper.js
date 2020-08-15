/*!
 * 图片浏览辅助工具函数
 * Created by j on 18/10/4.
 */

import fs from 'fs'
import path from 'path'

import glob from 'glob'
import moment from 'moment'

import electron from 'electron'

import _ from 'lodash'
import ocr from '../../../libs/baidu-ocr'
import stockQuery from '../../../libs/stock-query'

const viewerDbFactory = jsonDb('viewer')
import ju from '../../../libs/jodb-user'
import jsonDb from '../../../libs/json-jo'

const nativeImage = electron.nativeImage;

const viewerJsonDb = ju('viewer');
const imagesJsonDb = ju('images', {});

export default {
    /**
     * 获取文件夹里的图片对象数组: imgObjArr
     * @param dir {String|Array} 文件夹路径 或 图片数组
     * @param [conf] {Boolean|Object} 图片对象是否只包含路径
     * @returns {Array} [{f:图片路径，c:图片创建时间戳，d:图片创建日期, code: 股票code}]
     */
    getImages: function (dir, conf = {isOnlyPath: false, isReverse: true, isRefresh: false}) {
        console.log('getImages => ', dir);
        let arr;
        // 测试是否是交易记录图片, 因为主要功能是浏览k线截图
        if (dir.indexOf('截图') === -1) {
            let files = glob.sync(path.join(dir, './*.+(jpg|png)')) || [];
            return files.map((path) => {
                return {f: path};
            })
        }

        let key = dir.replace(/[/\s.\\]+/img, '_');
        if (conf.isReverse === false) {
            key = key + '_R';
        }
        let dirJo = viewerDbFactory(key);
        let cacheArr = dirJo.get();

        if (cacheArr && cacheArr.length && !conf.isRefresh) {
            arr = cacheArr;
        } else {
            arr = fs.readdirSync(dir);

            arr = arr.filter(f => {
                return /\.png$/img.test(f);
            });

            arr = this.supplement(arr, dir);

            arr = this._sort(arr, conf.isReverse);

            dirJo.set(arr).save();
        }

        return !conf.isOnlyPath ? arr : arr.map(o => {
            return o.f;
        });
    },

    supplement: function (arr, dir = '') {
        return arr.map(f => {
            // 先尝试读取缓存
            let key = this.getKey(f);
            let item = imagesJsonDb.get(f);
            if (item) return item;

            let fullPath = path.join(dir, f);
            let arr = f.match(/\d{6}(?=\.png$)/) || [];
            let code = arr[0];
            //let stat = fs.statSync(fullPath);
            //let c = stat.birthtimeMs;
            let f2 = f.replace('上午', 'am').replace('下午', 'pm');
            let arr2 = f2.match(/(\d{4}-\d{2}-\d{2})\s+[ap]m\d{1,2}\.\d{1,2}\.\d{1,2}/) || [];
            let m = moment(arr2[0], "YYYY-MM-DD Ah.m.s");
            item = {f: fullPath, c: +m, d: arr2[1], code};
            // 保存到缓存
            imagesJsonDb.set(key, item);
            return {f: fullPath, c: +m, d: arr2[1], code};
        });
    },

    /**
     * 缓存图片信息
     */
    cache: function () {
        let that = this;
        viewerJsonDb.each((item) => {
            let key = that.getKey(item.img);
            imagesJsonDb.set(key, item);
        });
    },

    getKey: function (imgPath) {
        return imgPath.split('/').pop().replace(/\s+|\./img, '_').replace(/_png$/, '');
    },

    sort: function (arr) {
        arr = this.supplement(arr);
        arr = this._sort(arr, true);
        return arr.map((item, i) => {
            return item.f;
        });
    },

    /**
     * @param images  {Array} imgObjArr 图片对象数组
     * @param isReverse [Bool] 是否反转排序
     * @returns {Array} imgObjArr
     */
    _sort: function (images, isReverse) {
        // 先按时间排序
        images.sort((a, b) => {
            let a1 = +moment(a.d);
            let b1 = +moment(b.d);
            return a1 - b1;
        });

        // 按照日期分组
        let dateMap = _.groupBy(images, function (o) {
            return o.d;
        });
        console.log('dateMap', dateMap);
        // 获取日期key数组，按照4个4个截取分组, 等于先按时间大致排序
        // [[{d:'2018-09-04'}, {d:'2018-09-05'},{d:'2018-09-06'} ,{d:'2018-09-07'}]]
        let dateKeyArr = _.keys(dateMap);
        console.log('dateKeyArr', dateKeyArr);

        let dateKeyChunkArr = _.chunk(dateKeyArr, 4);
        console.log('dateKeyChunkArr', dateKeyChunkArr);

        let dateMap2 = {};
        dateKeyChunkArr.forEach((chunks, index) => {
            chunks.forEach((dateKey) => {
                let arr = dateMap[dateKey];
                let arr2 = dateMap2[index] = dateMap2[index] || [];
                dateMap2[index] = arr2.concat(arr);
            });
        });
        console.log('dateMap2', dateMap2);

        let dateMapArr = _.values(dateMap2);
        console.log('dateMapArr', dateMapArr);
        // 处理相邻日期chunk数组里相同code被分割在两个chunk数组里的情况，移动相同code的imgObj到同一个chunk数组
        _.reduceRight(dateMapArr, function (prevArr, currentArr) {
            prevArr.forEach((imgObj, index) => {
                for (let i = currentArr.length - 1; i >= 0; i--) {
                    let imgObj2 = currentArr[i];
                    if (imgObj2.code === imgObj.code) {
                        let arr = currentArr.splice(i, 1);
                        prevArr.push(arr[0]);
                    }
                }
            });
            return currentArr;
        }, []);

        let resultArr = [];

        for (let i = 0; i < dateMapArr.length; i++) {
            let imgArr = dateMapArr[i];
            imgArr = this._sortByCodeAndDate(imgArr);
            console.log(111, imgArr);
            resultArr.push(imgArr);
        }

        resultArr = isReverse ? resultArr.reverse() : resultArr;
        return _.flatten(resultArr, true);
    },

    /**
     * 对imgObj数组按照相同code分组，在按日期排序;
     * @param images {Array} imgObjArr
     * @returns {Array} imgObjArr
     * @private
     */
    _sortByCodeAndDate: function (images) {
        // @step1: 按照code分组
        let map = _.groupBy(images, function (o) {
            return o.code;
        });
        // [[{code:'300012', d:'2018-09-07'}, {code:'300012', d:'2018-09-10'}], [{code:'600001', , d:'2018-04-10'}, {code:'600001', , d:'2018-04-11'}]]
        let arr = _.values(map);

        // @step2: 对code数组内部按日期排序
        arr.forEach(arr => {
            arr.sort(function (a, b) {
                return a.c - b.c;
            });
            let start = arr[0];
            let end = arr[arr.length - 1];
            if (start) start.start = 1;
            if (end) end.end = 1;
        });

        // @step3: 对code数组排序
        arr.sort(function (a, b) {
            return a[0].c - b[0].c;
        });

        return _.flatten(arr, true);
    },

    /**
     * 对图片进行剪切
     * @param imgPath {String} 图片路径
     * @param crop {Object} 剪切区域定义  => {x: 3140, y: 115, width: 310, height: 50}
     * @returns {string} 图片dataUrl
     */
    crop: function (imgPath, crop) {
        console.info('crop => ', imgPath, crop);
        let img = nativeImage.createFromPath(imgPath);
        img = img.crop(crop);
        let dataUrl = img.toDataURL();
        console.info("%c", `border:solid 1px blue;padding:20px 240px; line-height:60px;background:url(${ dataUrl }) no-repeat 0 0`);
        return dataUrl;
    },

    /**
     * 根据ocr结果对图片重命名; // '屏幕快照 2019-03-22 下午9.08.59 -九阳股份-002242.png' 重命名到: '九阳股份 2019-03-22 下午9.08.59 -九阳股份-002242.png'
     * @param images  {Array|String} 图片文件绝对路径
     * @param crop   {Object}  {x: 3140, y: 115, width: 310, height: 50}
     * @param cb  {Function} 处理每一个图片crop的回调
     * @return {undefined}
     */
    renameByOcr: function (images, crop, cb) {
        let that = this;
        // 如果是单个图片路径字符串，转为数组
        if (!Array.isArray(images)) {
            images = [images]
        }

        (function fn (arr) {
            let imgPath = arr.shift();

            // 忽略富途大盘指数截图
            if (/\d{2}\.\d{2}\.png$/img.test(imgPath)) {
                return fn(arr);
            }

            // 图片数组重命名结束
            if (!imgPath) {
                //$(that).icClearLoading();
                //return scope.init();
                return cb(null);
            }
            // 已经ocr 重命名过的跳过
            if (imgPath.match(/\d{6}(?=\.png$)/)) {
                // '屏幕快照 2019-03-22 下午9.08.59 -九阳股份-002242.png' 重命名到: '九阳股份 2019-03-22 下午9.08.59 -九阳股份-002242.png'
                let rename = imgPath.replace(/^(.+)\/(屏幕快照)(\s+.+\s+)-(.+)-(\d{6}\.png)$/img, '$1/$4$3-$4-$5');
                if (imgPath !== rename) {
                    fs.renameSync(imgPath, rename);
                }
                return fn(arr);
            }

            // 裁剪预览
            let dataUrl = that.crop(imgPath, crop);
            //$view_crop.attr('src', dataUrl);

            // ocr 命名
            ocr({
                image: dataUrl,
                callback: function (words) {
                    //$ocr_text.text(words);
                    cb({dataUrl, words});
                    let stock = stockQuery(words);
                    if (stock.code) {
                        let rename = imgPath
                            .replace('屏幕快照', stock.name)
                            .replace('(2)', `-${ stock.name }`)
                            .replace(/\.png$/, `-${ stock.code }.png`);
                        fs.renameSync(imgPath, rename);
                    } else {
                        console.error('ocr fail: ', imgPath, stock);
                        return fn(arr);
                    }
                    setTimeout(function () {
                        fn(arr);
                    }, 1000);
                }
            });

        })(images);


    }

};
