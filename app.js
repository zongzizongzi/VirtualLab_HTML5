/**
 * Created by bear on 2018/5/24.
 */
// var express = require("express");
global.tcp=require('./lib/TCPserver');
var ws=require('./lib/connectWS');
var login=require('./lib/login');
global.db=require('./lib/database');
global.logState=false;
global.tcpConnectState=false;
/*
var app = express();
app.use("/",express.static(__dirname));
var server=app.listen(3000);*/
