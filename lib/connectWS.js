/**
 * Created by admin on 2018/4/19.
 */
var qs=require('querystring');
let WebSocketServer = require('ws').Server;//引入ws模块，获取一个websocket服务器对象
var https=require('https');
var fs=require('fs');

var keypath='conf/214710934210741.key';
var certpath='conf/214710934210741.pem';
var options = {
    key: fs.readFileSync(keypath),
    cert: fs.readFileSync(certpath),
   // passphrase:'1234'//如果秘钥文件有密码的话，用这个属性设置密码
};

var server0=https.createServer(options, function (req, res) {//要是单纯的https连接的话就会返回这个东西
    res.writeHead(403);//403即可
    res.end("This is a  WebSockets server!\n");
}).listen(3002);
let ws = new WebSocketServer({
    //port : "3002",
    //host : "127.0.0.1",
    //host:"drvi.net",
    server:server0
});
console.log("ws Server listening on:",ws.host,ws.port);
ws.on("connection" , function(wsocket) {
    console.log("ws建立连接");
    //将wsocket变量变为全局变量，才能够在别的模块中访问到
    global.wsocket = wsocket;

    wsocket.on('message' , function(msg){
        //将接收到的字符串转换位为json对象
        var dataObj = qs.parse(msg);
        var pos=dataObj.points;
	console.log("ws received:",dataObj)
        var cmd=dataObj.instrInput;
        tcp.cnct(pos,cmd);
    });
    wsocket.on('error' , function(err){
        console.log("ws发生错误");
    });
    wsocket.on('close' , function(){
        console.log("ws连接关闭");
    });
    wsocket.on('open' , function(){
        console.log("ws打开");
    });
});
module.exports = ws;