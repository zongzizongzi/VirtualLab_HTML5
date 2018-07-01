﻿/**
 * Created by admin on 2018/4/19.
 */
var qs=require('querystring');
let WebSocketServer = require('ws').Server;//引入ws模块，获取一个websocket服务器对象
var https=require('https');
var fs=require('fs');
global.RTCPmsg='';

var keypath='conf/214710934210741.key';
var certpath='conf/214710934210741.pem';
var options = {
    key: fs.readFileSync(keypath),
    cert: fs.readFileSync(certpath),
   // passphrase:'1234'//如果秘钥文件有密码的话，用这个属性设置密码
};
var server0=https.createServer(options, function (req, res) {//要是单纯的https连接的话就会返回这个东西
    req.on("data",function (reqData) {
        var reqMsg=reqData.toString();
        var rtcpId=JSON.parse(reqMsg).rtcpId;
        console.log('收到视频流频道id:',rtcpId);
        RTCPmsg=reqMsg;
    })
    res.writeHead(200);//403即可
    res.end("This is a  WebSockets server!\n");

}).listen(3002,'0.0.0.0');
let ws = new WebSocketServer({
   /* port : "3002",
    host : "localhost",*/
    //host:"drvi.net",
    server:server0//基于HTTPS服务器建立一个加密的wss连接
});
console.log("ws Server listening on:",ws.host,ws.port);
ws.on("connection" , function(wsocket) {
    let userName,ip,logState=false;
    console.log("ws建立连接");
    //将wsocket变量变为全局变量，才能够在别的模块中访问到
    global.wsocket = wsocket;
    wsocket.on('message' , function(msg){
        if(tcpConnectState){
            wsocket.send("通道占用中，请稍后重试")
        }
        else{
            //将接收到的字符串转换位为json对象
            var dataObj = qs.parse(msg);
            ip=wsocket._socket.remoteAddress;//获取客户端地址
            userName=dataObj.name;
            console.log(ip);
            db.check_logStatus(userName,ip).then(function (value) {//以用户名和IP检查数据库，用户是否登录
                if(value){
                    var pos=dataObj.points;
                    console.log("ws received:",dataObj)
                    var cmd=dataObj.instrInput;
                    tcp.cnct(pos,cmd);
                    logState=true;
                }
                else {
                    wsocket.send("relog")
                }
            }).catch(function (value) {
                console.log("检查登录状态失败：",value)
            })
        }
    });
    wsocket.on('error' , function(err){
        console.log("ws发生错误");
    });
    wsocket.on('close' , function(){
        console.log("ws连接关闭");
        if(logState){
            db.delete_loginUser(userName,ip)
        }
    });
    wsocket.on('open' , function(){
        console.log("ws打开");
    });
    wsocket.send(RTCPmsg);
});
exports.sendData=function (str) {
    if(wsocket.readyState==1){
        wsocket.send(str);
        console.log('ws send ',str);
    }
    else {
        console.log('ws连接已断开')
        return
    }
}