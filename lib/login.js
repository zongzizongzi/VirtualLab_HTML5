/**
 * Created by bear on 2018/6/11.
 */
var http=require("http");
var qs=require('querystring');
var fs=require('fs');
var https=require('https');

var keypath='conf/214710934210741.key';
var certpath='conf/214710934210741.pem';
var options = {
    key: fs.readFileSync(keypath),
    cert: fs.readFileSync(certpath),
    // passphrase:'1234'//如果秘钥文件有密码的话，用这个属性设置密码
};

var server=https.createServer(options, function (req, res) {//要是单纯的https连接的话就会返回这个东西
    // req.on('data',function(chunk){
    res.writeHead(200, {
        'Content-Type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*',
        // 'Access-Control-Allow-Origin': 'https://drvi.net',
        'Access-Control-Request-Method': 'post'
    })//添加响应头，支持跨域
    req.on("data",function (reqData) {
        var reqMsg=qs.parse(reqData.toString());
        db.login(reqMsg).then(function (value) {
            console.log("返回消息：",value);
            res.end(value);
        });
        var ip=getClientIp(req);
        console.log(ip);
        db.add_loginUser(reqMsg.name,ip);
    })

    // });
});
server.listen(3003, '0.0.0.0',function() {
    console.log("Server listening on port 3003.");
});

//获取客户端ip
function getClientIp(req) {
    var ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress || '';
    if(ip.split(',').length>0){
        ip = ip.split(',')[0];
    }
    return ip;
}


