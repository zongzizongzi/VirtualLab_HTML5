
let qs=require('querystring');
let WebSocketServer = require('ws').Server;//引入ws模块，获取一个websocket服务器对象
let https=require('https');
let fs=require('fs');
global.RTCPmsg='';

let keypath='conf/214710934210741.key';
let certpath='conf/214710934210741.pem';
let options = {
    key: fs.readFileSync(keypath),
    cert: fs.readFileSync(certpath),
   // passphrase:'1234'//如果秘钥文件有密码的话，用这个属性设置密码
};
let server0=https.createServer(options, function (req, res) {//要是单纯的https连接的话就会返回这个东西
    res.writeHead(200, {
        'Content-Type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Request-Method': 'post'
    })//添加响应头，支持跨域
    req.on("data",function (reqData) {
        let reqMsg=reqData.toString();
        let rtcpId=JSON.parse(reqMsg).rtcpId;
        console.log('收到视频流频道id:',rtcpId);
        RTCPmsg=reqMsg;
    });
    res.end("This is a  WebSockets server!\n");

}).listen(3002,'0.0.0.0');
let ws = new WebSocketServer({
   /* port : "3002",
    host : "localhost",*/
    //host:"drvi.net",
    server:server0//基于HTTPS服务器建立一个加密的wss连接
});
console.log("ws Server listening on port:3002");
ws.on("connection" , function(wsocket) {
    let userName,ip,logState=false;
    console.log("ws建立连接");
    //将wsocket变量变为全局变量，才能够在别的模块中访问到
    global.wsocket = wsocket;
    wsocket.on('message' , function(msg){
        if(using){
            wsocket.send("通道占用中，请稍后重试")
        }
        if(!tcpConnectState){
            wsocket.send("未连接到机器人控制器")
        }
        else{
            //将接收到的字符串转换位为json对象
            let dataObj = qs.parse(msg);
            ip=wsocket._socket.remoteAddress;//获取客户端地址
            userName=dataObj.name;
            console.log(ip);
            db.check_logStatus(userName,ip).then(function (value) {//以用户名和IP检查数据库，用户是否登录
                if(value){
                    let pos=dataObj.points;
                    console.log("ws received:",dataObj);
                    let cmd=dataObj.instrInput;
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
            db.delete_loginUser(userName,ip);//ws连接关闭（刷新或关闭网页）将用户从已登录列表移除
        }
        if(userName=="admin"&&tcpConnectState){//若管理员用户退出，则关闭TCP连接
           tcp.sendEnd();
        }
    });
    wsocket.on('open' , function(){
        console.log("ws打开");
    });
    if(RTCPmsg!='') wsocket.send(RTCPmsg);//若有视频流信息，向客户端发送视频流信息。
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