/**
 * Created by admin on 2018/3/22.
 */
function communcication(object){
    this.port = object.port ? object.port : "3002";
    this.host = object.host ? object.host : "114.215.189.49";
    this.isConnect = false;//默认没有连接
    const _this=this;
    this.webSocket = null;
    //需要的函数
    this.openFun = function(){
        console.log("连接已打开");
    };
    this.messageFun = function(event){
        let received_msg=event.data;
        console.log("收到的消息为:" + received_msg);
        if(received_msg==="go"){
            Instructions();
        }
        else{console.log(received_msg)}
    };
    this.errorFun = function(err){
        console.log("发生错误");
    };
    this.closeFun = function(){
        console.log("已经关闭与服务器的连接，正在尝试重新连接");
	_this.disconnect();
	_this.connect();
    };
}

communcication.prototype = {
    //进行连接
    connect : function(){
	if ("WebSocket" in window)
    	{
        	this.webSocket = new WebSocket("wss://" + this.host + ":" + this.port);
        	this.eventListener();
        	console.log("连接到：","ws://" + this.host + ":" + this.port);
	}
	else{
 		alert("您的浏览器不支持 WebSocket!")
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