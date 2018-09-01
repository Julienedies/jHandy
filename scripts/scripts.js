/**
 * Created by j on 18/5/23.
 * 获取百度ocr api 访问key
 */

var https = require('https');
var qs = require('querystring');

const config = require('config.json');

const param = qs.stringify(config.api.baidu.ocr.param);

https.get(
    {
        hostname: 'aip.baidubce.com',
        path: '/oauth/2.0/token?' + param,
        agent: false
    },
    function (res) {
        // 在标准输出中查看运行结果
        res.pipe(process.stdout);
    }
);

