/**
 * Created by bear on 2018/1/15.
 */
//127.0.0.1:3000
var http=require("http");
var fs=require("fs");
var path=require("path");
var mime=require("mime");
var net = require('net');
var tcp=require('./lib/TCPserver');
var ws=require('./lib/connectWS');
var qs=require('querystring');


var cache={};

function send404(response) {
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
}

function sendFile(response, filePath, fileContents) {
    response.writeHead(
        200,
        {"content-type": mime.lookup(path.basename(filePath))}
    );
    response.end(fileContents);
}

function serveStatic(response, cache, absPath) {
    if (cache[absPath]) {
        sendFile(response, absPath, cache[absPath]);
    } else {
        fs.exists(absPath, function(exists) {
            if (exists) {
                fs.readFile(absPath, function(err, data) {
                    if (err) {
                        send404(response);
                    } else {
                        cache[absPath] = data;
                        sendFile(response, absPath, data);
                    }
                });
            } else {
                send404(response);
            }
        });
    }
}

var server = http.createServer(function(req, res) {
    var filePath = false;
    console.log(req.method,req.url);
    if (req.url == '/') {
        switch (req.method) {
            case 'GET':
                filePath = '/index.html';
                break;
            case 'POST':
                req.setEncoding('utf8');
                req.on('data',function(chunk){
                    console.log(chunk);
                    var dataString = chunk.toString();
                    console.log(dataString);
                    //将接收到的字符串转换位为json对象
                    var dataObj = qs.parse(dataString);
                    console.log(dataObj)
                    // var message=qs.parse(body);
                    var pos=dataObj.points;
                    var cmd=dataObj.instrInput;
                    tcp.cnct(pos,cmd);
                });
                /*req.on('data',function(data){
                    var message=qs.parse(body);
                    console.log(message);
                });*/
                break;
            default:
                send404(res);
        }

    } else {
        filePath = req.url;
    }
    var absPath = '.' + filePath;
    // absPath.replace(/\//g,"\\\\");
    serveStatic(res, cache, absPath);
});

server.listen(3000, function() {
    console.log("Server listening on port 3000.");
});