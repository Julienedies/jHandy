/**
 * 包装jsono、recordManager、objm | json object dataBase => jodb
 * Created by j on 2019-07-13.
 */

import jsono from './jsono'
import objm from './objm'
import recordManager from './recordManager'

/**
 * json文件数据增删改查：jsono用于序列化及简单数据修改，objm 和 recordManager 用于辅助复杂json增删改查；
 * @param jsonFilePath {String} json文件路径
 * @param initData {Object|Array} json文件初始数据类型
 * @param conf {Object} 可选，recordManager用配置参数对象
 * @return {Objm|RecordManager}
 */
export default function (jsonFilePath, initData = [], conf = {}) {

    const jo = jsono(jsonFilePath, initData);

    let dob = Array.isArray(initData) ? recordManager(conf) : objm();

    dob.on('change', function (msg) {
        jo.json = dob.get();
        jo.save();
    });

    dob.init(jo.json);

    return dob;

}
