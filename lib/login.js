/**
 * Created by bear on 2018/6/11.
 */
var http=require("http");
var qs=require('querystring');
var server = http.createServer(function(req, res) {
    // req.on('data',function(chunk){
    res.writeHead(200, {
        'Content-Type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Request-Method': 'post'
    })//添加响应头，支持跨域
    req.on("data",function (reqData) {
        var reqMsg=qs.parse(reqData.toString());
        console.log(reqMsg);
        var resJSON=db.login(reqMsg);
        var ip=getClientIp(req);
        db.add_loginUser(ip,reqMsg.name);
        res.end(resJSON);
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
        ip = ip.split(',')[0]
    }
    return ip;
}


