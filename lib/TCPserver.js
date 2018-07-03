var net = require('net');

var HOST = '114.215.189.49';
// var HOST="127.0.0.1";
var PORT = 3001;
// var pPos="p0:[364.35,0,594,-180°,60°,-180°];\n"+"p1[464.35,0,594,-180°,60°,-180°];\n"+"p2:[467.54,0,371.09,180°,30°,-180°];\n"+"p3[346.62,0,225.29,180°,0°,-180°];\n";
// var command="moveJ p0,v100;moveL p1,v100;moveC p2,p3,v100;";

function Split(str) {
    var arr=(str.replace(/\r|\n|\s|°/g,'')).split(";");//剔除所有换行回车和空格，并以分号分割
    var newArr=[];//用于存储不为''的元素
    for(let value of arr){
        if(''!= value) {newArr.push(value);}
    }
    return newArr;
}

exports.cnct=function(pPos,command) {
    var server = net.createServer();
    server.listen(PORT, HOST);
    console.log('TCP Server listening on ' + HOST +':'+ PORT,"at",new Date());
// 创建一个TCP服务器实例，调用listen函数开始监听指定端口
// 在每一个“connection”事件中，该回调函数接收到的socket对象是唯一的
    let timer=setTimeout(function(){
        server.close();
        if(wsocket.readyState==1){
            wsocket.send('远程TCP服务器已断开，请稍后重试')
        }else {
            console.log('ws连接错误');
            return;
        }
    },60000);
    server.on('connection', function(sock) {
        //有客户端连接上服务器，将客户端记为sock
        global.tcpSock=sock;
        tcpConnectState=true;
        clearTimeout(timer);
        console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort,"at",new Date());
        sock.write("start");//发送开始标识
	    console.log("TCP send start")
        var i=0;
        var cmdSplit=Split(command);//将指令处理为单条消息
        var posSplit=Split(pPos);//将示教点处理为单条消息
        var pLen=posSplit.length,cLen=cmdSplit.length;
        var message="";//返回信息
        var sendString;
        // 为这个socket实例添加一个"data"事件处理函数，收到数据data时回调
        sock.on('data', function(data) {
            console.log('DATA ' + sock.remoteAddress + ': ' + data);
            //收到ready说明机器人已完成上一指令，可继续发送指令
            if(data=="ready"){
                if(i<pLen){
                    sendString="p:"+posSplit[i];
                    sock.write(sendString);
                    console.log("send p",i,":",sendString);
                }
                else if(i<(pLen+cLen)) {
                    sendString="cmd:"+cmdSplit[i-pLen]+';';
                    sock.write(sendString);
                    console.log("send cmd",i-pLen,":",sendString,"\n i:",i);
                    if(wsocket.readyState==1){
                        if(i==pLen){
                            wsocket.send('go');
                            console.log('ws send go') ;
                        }
                        else {
                            wsocket.send('continue');
                            console.log('ws send continue') ;
                        }
                    }
                   /* if(i==pLen){
                        if(wsocket.readyState==1){
                            wsocket.send('go')
			        console.log('ws send go')
                        }*/
                   /* if(wsocket.readyState==1){
                        wsocket.send(sendString);
                        console.log('ws send '+sendString)
                    }*/
                    else {
                        console.log('ws连接错误')
                        return
                    }
                    // }
                }
                else {
                    if(cLen==0){
                        wsocket.send('go')
                        console.log('ws send go')
                    }
                    sock.write('end');
                    return;
                }
                i++;
            }
            //机器人收到end后回发end，说明机器人已知指令结束
            if(data=="end"||data.toString().search('end')!=-1){
                //服务器收到end关闭此次socket连接，并关闭服务器
                sock.end();
                server.close(function(){
                    console.log("tcp服务器关闭")
                })
            }
            else if(data=="dataError"){
                return
                console.log("dataError");
            }
        });
        // 为这个socket实例添加一个"close"事件处理函数
        sock.on('close', function(data) {
            console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
            tcpConnectState=false;
            i=0;
            posSplit=[];
            cmdSplit=[];
        });
        sock.on('error',function () {
            tcpConnectState=false;
            sock.end();
            server.close(function(){
                console.log("tcp服务器因错误导致关闭");
                if(wsocket.readyState==1){
                    wsocket.send('TCP连接错误，请重新提交');
                }
                else {
                    console.log('ws连接错误');
                    return
                }
            })
        })
    });

}

