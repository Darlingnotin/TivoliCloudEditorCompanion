fs = require("fs")
var serverPort = 80;
var http = require("http"),
  url = require("url"),
  path = require("path"),
  fs = require("fs")
port = process.argv[2] || serverPort;
var fs = require('fs');
const serverFolder = './ServerFiles/';
if (!fs.existsSync(serverFolder)) {
  fs.mkdirSync(serverFolder);
}
http.createServer(function (request, response) {
  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), "/ServerFiles", uri);

  var contentTypesByExtension = {
    '.html': "text/html",
    '.css': "text/css",
    '.js': "text/javascript"
  };
  var jsonData = [];
  if (uri == "/files.json") {
    fs.readdir(serverFolder, (err, files) => {
      if (files == undefined) {
        jsonData.push(undefined);
        sendPage(JSON.stringify(jsonData));
        return;
      }
      files.forEach(file => {
        jsonData.push(file);
      });
      sendPage(JSON.stringify(jsonData));
    });
    return;
  }
  function sendPage(pageData) {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.write(pageData);
    response.end();
  }

  fs.exists(filename, function (exists) {
    if (!exists) {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.write("404 Not Found\n");
      response.end();
      return;
    }

    fs.readFile(filename, "binary", function (err, file) {
      if (err) {
        response.writeHead(500, { "Content-Type": "text/plain" });
        response.write(err + "\n");
        response.end();
        return;
      }
      var headers = {};
      var contentType = contentTypesByExtension[path.extname(filename)];
      if (contentType) headers["Content-Type"] = contentType;
      response.writeHead(200, headers);
      response.write(file, "binary");
      response.end();
    });
  });
}).listen(parseInt(port, 10));

console.log("Tivoli Cloud Editor Companion Server Up");

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 888 });
wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    var messageData = JSON.parse(data);
    if (messageData.action == "saveFile") {
      fs.writeFile("ServerFiles/" + messageData.fileName, messageData.fileData, function (err) {
        if (err) return console.log(err);
      });
    } else if (messageData.action == "loadFile") {
      fs.readFile(process.cwd() + "/ServerFiles/" + messageData.fileName, "binary", function (err, file) {
        ws.send(JSON.stringify({
          action: "loadFileResponse",
          file: file
        }));
      });
    } else if (messageData.action == "requestFileList") {
      var jsonData = [];
      fs.readdir(serverFolder, (err, files) => {
        files.forEach(file => {
          jsonData.push(file);
        });
        ws.send(JSON.stringify({
          action: "requestFileListResponse",
          fileList: jsonData
        }));
      });
    }
  });
});
