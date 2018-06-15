/**
 * Created by bear on 2018/6/15.
 */
var mysql=require('mysql');
connection =mysql.createConnection({
    hosts:'localhost',
    user:'root',
    port: '3306',
    password : '',
    database : 'VLAB',
    // insecureAuth : true
});
exports.login=function (reqMsg) {
    connection = mysql.createConnection(connection.config);
    connection.connect();
    var resMsg;
    var sql = "select * from vlab_users where name='"+reqMsg.name+"' and pswd='"+reqMsg.password+"'";    //    在数据库里面查询用户名跟密码
    connection.query(sql,function (err, result) {
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
        }
        else{
            resMsg={
                status:"success",
                statusTxt:"登录成功"
            };
            // res.end("登陆成功");    //返回登录成功
            console.log("登录成功");
            logState=true;
        }
    });
    connection.end();
    var resJSON=JSON.stringify(resMsg);
    return resJSON;
}

exports.add_loginUser=function (name,ip) {
    connection = mysql.createConnection(connection.config);
    connection.connect();
    var sql = "INSERT INTO log_user (name, ip) VALUES ('"+name+"', '"+ip+"')";
    connection.query(sql,function (err, result) {
        var resMsg;
        if (err) {//    数据库错误
            console.log("添加登录数据失败!",err);
            // res.end("数据库错误");
        }
        else {
            console.log("添加登录数据成功!name:",name,"ip:",ip);
        }
    })
    connection.end();
}
