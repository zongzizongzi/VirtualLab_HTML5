/**
 * Created by bear on 2018/6/22.
 */
let wsServerAddr={
    port:'3002',
//       host:'localhost',/*本地测试用*/
    host:'drvi.net'//wss连接必须用域名，不能用IP地址
};
let ws=new communcication(wsServerAddr);
ws.connect();
let logStatus=false,logName='';
function submitInstructions() {
    if(!logStatus){
        var logLayer=layer.open({
            title: '管理员登录 ',
            maxmin: true,
            shadeClose: true, //点击遮罩关闭层
            content: '<form id="login" name="n&p">' +
            '<p><label for="name" style="width: 60px;display:inline-block">用户名：</label><input type="text" name="name" ></p>' +
            '<p><label for="password" style="width: 60px;display:inline-block">密码：</label><input type="password" name="password"></p>' +
            '</form>',
            btn:'提交',
            yes: function(index, layero){
                let logData=$('#login').serialize();
                $.ajax({
                    url:'https://drvi.net:3003',
//                       url:'http://localhost:3003',
                    type:"POST",
                    data:logData,
                    success: function(data){    //    alert后台返回的参数
                        console.log(data.statusTxt);
                        if(data.status=="success"){
                            layer.close(logLayer);
                            logStatus=true;
                            logName=data.userName;
                            loginSuccess();

                        }
                        else{alert(data.statusTxt);}

                    },
                    error:function (err) {
                        alert("访问失败");
                        console.log(err);
                    }
                })
                /*ws.send(logData);
                 let data=$('#myform').serialize();
                 ws.send(data);*/
            }
        });
    }
    else {
        loginSuccess();
    }
}
function loginSuccess() {
    sendFormData();
    layer.msg( '登录成功，数据传输中……')
}
function sendFormData() {
    setTimeout(function () {
        if(ws.onOpen){
            let formData=$('#points').serialize()+"&"+$('#instrInput').serialize()+"&name="+logName;
            ws.send(formData);
        }
        else {
            alert('远程服务器未连接,请稍后重试')
        }
    },500);
}