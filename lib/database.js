/**
 * Created by bear on 2018/6/15.
 */
let mysql=require('mysql');
connection =mysql.createConnection({
    hosts:'localhost',
    user:'root',
    port: '3306',
    password : '',
    database : 'VLAB',
    // insecureAuth : true
});

connection.connect();
let clearSql="delete from log_user";
connection.query(clearSql,function (err, result) {
    if (err) {//    数据库错误
        console.log("重置登录数据失败!",err);
        // res.end("数据库错误");
    }
    else {
        console.log("重置登录数据成功!");
    }
})
connection.end();

exports.login=function (reqMsg) {
    connection = mysql.createConnection(connection.config);
    connection.connect();
    let resMsg;
    let sql = "select * from vlab_users where name='"+reqMsg.name+"' and pswd='"+reqMsg.password+"'";    //    在数据库里面查询用户名跟密码
    let promise=new Promise(function (resolve,reject) {
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
                    statusTxt:"登录成功",
                    userName:reqMsg.name
                };
                console.log("登录成功");
            }
            let resJSON=JSON.stringify(resMsg);
            resolve(resJSON)
        });
    });
    connection.end();
   return promise ;

}

exports.add_loginUser=function (name,ip) {
    connection = mysql.createConnection(connection.config);
    connection.connect();
    let sql = "INSERT INTO log_user (name, ip) VALUES ('"+name+"', '"+ip+"')";
    connection.query(sql,function (err, result) {
        let resMsg;
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

exports.check_logStatus=function (name,ip) {
    connection = mysql.createConnection(connection.config);
    connection.connect();
    let sql =  "select * from log_user where name='"+name+"' and ip='"+ip+"'";
    console.log(sql)
    let promise=new Promise(function (resolve,reject) {
        connection.query(sql,function (err, result) {
            if(err){//    数据库错误
                reject(err)
            }
            if(result==undefined||result.length==0){
                resolve(false);
            }
            else{
            resolve(true);
            }
        });
    });
    connection.end();
    return promise ;
}

exports.delete_loginUser=function (name,ip) {
    connection = mysql.createConnection(connection.config);
    connection.connect();
    let sql = "delete from log_user where name='"+name+"' and ip='"+ip+"'";
    connection.query(sql,function (err, result) {
        if (err) {//    数据库错误
            console.log("删除登录数据失败!",err);
            // res.end("数据库错误");
        }
        else {
            console.log("删除登录数据成功!name:",name,"ip:",ip);
        }
    });
    connection.end();
}