/**
 * Created by admin on 2018/3/22.
 */
function communcication(object){
    this.port = object.port ? object.port : "3002";
    this.host = object.host ? object.host : 'drvi.net';
    // this.host = object.host ? object.host : "localhost";
    this.isConnect = false;//默认没有连接
    const _this=this;
    this.webSocket = null;
    //需要的函数
    let i=0;
    this.onOpen=false;
    var remoting=false;//是否正在远程控制中
    this.openFun = function(){
        i=0;
        _this.onOpen=true;
        console.log("连接已打开");
        // alert('communication.js')
    };
    this.messageFun = function(event){
        let received_msg=event.data;
        if(received_msg==="go"){
            layer.closeAll();
                let points=document.getElementById("points").value.toString();
                let cmd=document.getElementById("instrInput").value.toString();
                remoting=true;
                instructionCompiling.stepsNum++;
                instructionCompiling.toggleObserver(points,cmd,true);//收到消息为go后执行RAPID指令

        }
        if(received_msg==="continue"){
            if(remoting){
                if(!instructionCompiling.stepsNum){
                    instructionCompiling.stepsNum++;
                    instructionCompiling.instrCompiling();
                }
                else instructionCompiling.stepsNum++;
            }
        }
        /*else if(received_msg.match('cmd')!==null){
            received_msg=received_msg.replace('cmd:','');
            let points=document.getElementById("points").value.toString();
            instructionCompiling.toggleObserver(points,received_msg);

        }*/
        else if(received_msg==='relog'){
            logStatus=false;
            layer.msg("请登录后重试",{title:"来自服务器的消息：",icon: 7});
        }
        else if(received_msg.match('rtcpId')!==null){
            let msg=JSON.parse(received_msg).rtcpId;
            RTCPID=msg;
            document.getElementById('videoFrame').src="RTCP/sub.html";
            console.log("RTCPID:",msg);
        }
        else{
            layer.msg(received_msg,{title:"来自服务器的消息：",icon: 7});
        };
    };
    this.errorFun = function(err){
        console.log("发生错误");
    };
    this.closeFun = function(){
        i++;
        _this.onOpen=false;
        layer.msg("远程服务器已断开,请稍后重试",{title:"来自服务器的消息：",icon: 7});
        _this.disconnect();
       /* if(i>=5){
            alert('远程服务器已断开，请与管理员联系');
            return;
        }
        _this.connect();*/
    };
}

communcication.prototype = {
    //进行连接
    connect : function(){
	if ("WebSocket" in window)
    	{
        	this.webSocket = new WebSocket("wss://" + this.host + ":" + this.port);
        	this.eventListener();
        	console.log("正在连接：","wss://" + this.host + ":" + this.port);
	    }
        else{
            alert("您的浏览器不支持 WebSocket!");
            }
    },
    //断开连接
    disconnect : function(){
        this.webSocket.close();
    },
    //发送数据
    send : function(datas){
        this.webSocket.send(datas);
    },
    //进行事件的监听,绑定默认
    eventListener : function() {
        this.webSocket.onopen = this.openFun;
        this.webSocket.onmessage = this.messageFun;
        this.webSocket.onerror = this.errorFun;
        this.webSocket.onclose = this.closeFun;
    },
    //进行事件的添加
    attachEvent : function(type , handler) {
        switch(type) {
            case "open" : {
                this.openFun = handler;
                this.webSocket.onopen = this.openFun;
                break;
            }
            case "message" : {
                this.messageFun = handler;
                this.webSocket.onmessage = this.messageFun;
                break;
            }
            case "error" : {
                this.errorFun = handler;
                this.webSocket.onerror = this.errorFun;
                break;
            }
            case "close" : {
                this.closeFun = handler;
                this.webSocket.onclose = this.closeFun;
                break;
            }
            default : {
                console.log("添加事件失败");
                break;
            }
        }
    }
};