/**
 * Created by bear on 2018/7/3.
 */
var http=require("http");
var fs=require("fs");
var path=require("path");
var mime=require("mime");
var net = require('net');
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
    console.log(absPath);
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
                filePath = '/pub.html';
                break;
            case 'POST':
                break;
            default:
                send404(res);
        }
    }
    else {
        filePath = req.url;
    }
    var absPath = './RTCP'+filePath;
    // absPath.replace(/\//g,"\\\\");
    serveStatic(res, cache, absPath);
});

server.listen(3004, function() {
    console.log("rtcp listening on port 3004.");
});