/**
 * Created by bear on 2018/6/11.
 */
var mysql=require('mysql');
var http=require("http");
var qs=require('querystring');
var server = http.createServer(function(req, res) {
    // req.on('data',function(chunk){
    res.writeHead(200, {
        'Content-Type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Request-Method': 'PUT'
    })//添加响应头，支持跨域
    req.on("data",function (reqData) {
        var reqMsg=qs.parse(reqData.toString());
        console.log(reqMsg);
        var connection =mysql.createConnection({
            hosts:'localhost',
            user:'root',
            port: '3306',
            password : '',
            database : 'VLAB',
            // insecureAuth : true
        });
        connection.connect();


        var sql = "select * from vlab_users where name='"+reqMsg.name+"' and pswd='"+reqMsg.password+"'";    //    在数据库里面查询用户名跟密码
        connection.query(sql,function (err, result) {
            var resMsg,resJSON;
            if(err){//    数据库错误
                resMsg={
                    status:"db_error",
                    statusTxt:"数据库错误"
                };
                // res.end("数据库错误");
            }
            if(result==undefined||result.length==0){
                resMsg={
                    status:"user_error",
                    statusTxt:"用户名密码不正确"
                };
                // res.end("用户名密码不正确");    //    数据库里面没找到配对的内容返回参数
                console.log("用户名密码不正确")
            }else{
                resMsg={
                    status:"success",
                    statusTxt:"登录成功"
                };
                // res.end("登陆成功");    //返回登录成功
                console.log("登陆成功");
                logState=true;
            }
            resJSON=JSON.stringify(resMsg);
            res.end(resJSON);
        });
        connection.end();
    })

    // });
});
server.listen(3003, function() {
    console.log("Server listening on port 3003.");
});

