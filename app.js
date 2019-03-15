/**
 * Created by bear on 2018/5/24.
 */
// var express = require("express");
global.tcp=require('./lib/TCPserver');//与机器人之间的TCPsocket连接
global.ws=require('./lib/connectWS');//基于https的websocket连接port=3002，同时接收rtcp上传的视频通道id
var login=require('./lib/login');//用于提交登录port=3003(https)

global.db=require('./lib/database');//数据库操作
global.tcpConnectState=false;
global.using=false;
// var rtcp=require('./lib/rtcp');//用于直播114.215.189.49:3004
/*
var app = express();
app.use("/",express.static(__dirname));
var server=app.listen(3000);*/
