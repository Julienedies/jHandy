/*!
 * 把json文件包装成对象进行增删改查 json object
 * Created by j on 18/11/9.
 */

import fs from 'fs'
import path from 'path'
import fse from 'fs-extra'

class Jo {

    /**
     *
     * @param jsonPath {String} json file path
     * @param initData {*} 初始数据
     */
    constructor (jsonPath, initData = {}) {

        jsonPath = path.resolve(__dirname, `${ jsonPath }`)
        this.jsonPath = jsonPath

        if (!fs.existsSync(jsonPath)) {
            // fs.createWriteStream(jsonPath)
            // fs.writeFileSync(jsonPath, '{}')
            fse.outputFileSync(jsonPath)
            this.json = initData
        } else {
            try {
                let str = fs.readFileSync(this.jsonPath, 'utf8')
                this.json = JSON.parse(str)
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    merge (key, obj) {
        let args = [].slice.call(arguments)
        obj = args[1] || args[0]
        key = args[1] && args[0]
        let oldVal = this.get(key)
        if(!oldVal){
            oldVal = {}
            this.set(key, oldVal)
        }
        Object.assign(oldVal, obj)
        return this
    }

    save () {
        fs.writeFileSync(this.jsonPath, JSON.stringify(this.json, null, '\t'))
        return this
    }

    set (key, val = {}) {
        if (!key) return this;

        if(typeof key === 'object') {
            this.json = key
            return this
        }

        let keys = key.split('.')

        return (function fx (namespace, keys) {
            let k = keys.shift()
            let o = namespace[k]

            if(keys.length){

                o = namespace[k] = o || {}
                fx(o, keys)

            }else{
                namespace[k] = val
            }

        })(this.json, keys);
    }

    get (key) {
        if (!key) return this.json

        let keys = key.split('.')

        return (function fx (namespace, keys) {
            let k = keys.shift()
            let o = namespace[k]
            if (o && keys.length) return fx(namespace[k], keys)
            return o
        })(this.json, keys)
    }

    match (key) {
        return this.get(key)
    }

}


export { Jo }


export default function (jsonFile, initData) {
    return new Jo(jsonFile, initData)
}
