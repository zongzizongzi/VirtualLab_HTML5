var net = require('net');
var HOST = '127.0.0.1';
var PORT = 55000;

// var pPos=[[364.35, 0, 594, -3.141592653589793, 1.0471975511965976, -3.141592653589793],[464.35, 0, 594, -3.141592653589793, 1.0471848490249271, -3.141592653589793],[467.5397, 0, 371.0948, 3.141592653589793, 0.5236114777699694, -3.141592653589793],[346.6218, 0, 225.2872, 3.141592653589793, 0, -3.141592653589793]]
// var command="moveJ p0,v100;moveL p1,v100;moveC p2,p3,v100;";
//p0:[364.35,0,594,-180,60,-180];\np1:[467.54,0,371.09,180,30,-180];\n
function split(string) {
    var arr=(string.replace(/\r|\n|\s|°/g,'')).split(";");//剔除所有换行回车和空格，并以分号分割
    var newArr=[];//用于存储不为''的元素
    for(let value of arr){
        if(''!= value) {newArr.push(value);}
    }
    return newArr;
}
exports.cnct=function (pPos,command) {
    var client = new net.Socket();
    // console.log(pPos,command);
    var cmdSplit=split(command);//处理为单条消息
    var posSplit=split(pPos);
    var pLen=posSplit.length,cLen=cmdSplit.length;
    var i;
    var message="";//返回信息
    client.connect(PORT, HOST, function() {
        i=0;
        console.log('CONNECTED TO: ' + HOST + ':' + PORT);
    });
// 为客户端添加“data”事件处理函数
// data是服务器发回的数据
    client.on('data', function(data) {
        console.log('DATA: ' + data);
        if(data=="ready"){
            if(i<pLen){
                var pString="p:"+posSplit[i];
                client.write(pString);
                console.log("send p",i,":",pString);
            }
            else if(i<(pLen+cLen)) {
                //if(cmdSplit[i-pLen]==""){i++}
                var cmdString="cmd:"+cmdSplit[i-pLen]+';';
                client.write(cmdString);
                console.log("send cmd",i-pLen,":",cmdString,"\n i:",i);
            }
            else {
                client.write('end');
                message='传输完成';
                console.log("send end");
                client.destroy();
                return;
            }
            i++;
        }
        /*if(data=="end"){
            client.destroy();
            console.log("we end the client");
        }*/
        if(data=="dataError"){
            return
            console.log("dataError");
        }
    });
// 为客户端添加“close”事件处理函数
    client.on('close', function() {
        console.log('Connection closed');
    });
    client.on('error', function(err){
        console.log(err);
        console.log('Connection error');
        client.destroy();
    });
}

