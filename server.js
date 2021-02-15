fs = require("fs")
var serverPort = 80;
var http = require("http"),
  url = require("url"),
  path = require("path"),
  fs = require("fs")
port = process.argv[2] || serverPort;
var fs = require('fs');
const request = require('request');
const serverFolder = './ServerFiles/';
if (!fs.existsSync(serverFolder)) {
  fs.mkdirSync(serverFolder);
}
var pageData;
http.createServer(function (request, response) {
  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), "/ServerFiles", uri);

  var contentTypesByExtension = {
    '.html': "text/html",
    '.css': "text/css",
    '.js': "text/javascript"
  };
  var jsonData = [];
  var fileType = request.url.split(".")[1];
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
  } else if (request.url == "/?") {
    var pageData = "<html><head></head><body style=\"background-color:black;\">" +
      "<div><h1 style=\"color: white; padding: 10px; background-color: rgb(133, 133, 133); border-radius: 5px;\">Tivoli Cloud Editor Companion Help</h1>" +
      "<h2 style=\"color: white; padding: 10px; background-color: rgb(133, 133, 133); border-radius: 5px;\">Web socket server request methods<br><br>" +
      "Request<br>{action:\"requestFileList\"}<br>Returns<br>{\"action\":\"requestFileListResponse\",\"fileList\":[\"Files.txt\"]}<br><br>" +
      "Request<br>{action:\"requestFile\",fileName: \"Files.txt\"}<br>Returns<br>{\"action\":\"requestFileResponse\",\"file\":\"text\"}<br><br>" +
      "Request<br>{action:\"requestRemoteFile\",url: \"http://localhost/Files.txt\"}<br>Returns<br>{\"action\":\"requestRemoteFileResponse\",\"file\":\"text\"}<br><br>" +
      "Request<br>{action: \"?\"}</p2></div>";
    response.writeHead(200, { "Content-Type": "text/html" });
    response.write(pageData);
    response.end();
    return;
  } else if (fileType == "glb?" || fileType == "gltf?" || fileType == "fbx?" || fileType == "obj?") {
    var script = "(function () {this.preload = function (uuid) {Script.setTimeout(function () {var entityProperties = Entities.getEntityProperties(uuid);Entities.editEntity(uuid, {dimensions: entityProperties.naturalDimensions});}, 1000);}})";
    var pageData = "{\"DataVersion\": 0,\"Paths\":{\"/\": \"/-6.57834,-0.17172,-2.01974/0,-0.803955,0,0.59469\"},\"Entities\": [{\"type\":\"Model\",\"script\":\"" + script + "\",\"modelURL\": \"http://localhost" + request.url.replace('?', '') +
      "\"}],\"Id\": \"{0e48ebd2-81c9-4251-9dc8-cf9a406b753d}\",\"Version\": 125}";
    response.writeHead(200, { "Content-Type": "text/html" });
    response.write(pageData);
    response.end();
    return;
  } else if (uri == "/") {
    pageData = "<html><head></head><body style=\"background-color:black;\"><h1 style=\"color: white; padding: 10px; background-color: rgb(133, 133, 133); border-radius: 5px;\">Tivoli Cloud Editor Companion Files</h1>";
    fs.readdir(serverFolder, (err, files) => {
      if (files.length === 0) {
        pageData = pageData + "<div style=\"color: white; padding: 5px; background-color: rgb(133, 133, 133); border-radius: 5px;\"><h2>Server Empty</h2></div></body></html>";
        sendPage(pageData);
      } else {
        pageData = pageData + "<div style=\"color: white; padding: 5px; background-color: rgb(133, 133, 133); border-radius: 5px;\">";
        files.forEach(file => {
          pageData = pageData + "<h2>http://localhost/" + file + "</h2>";
        });
        sendPage(pageData + "</div></body></html>");
      }
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
    try {
      var messageData = JSON.parse(data);
    } catch (error) {
      return;
    }
    if (messageData.action == "saveFile") {
      fs.writeFile("ServerFiles/" + messageData.fileName, messageData.fileData, function (err) {
        if (err) return console.log(err);
      });
    } else if (messageData.action == "requestFile") {
      var filename = process.cwd() + "/ServerFiles/" + messageData.fileName;
      fs.exists(filename, function (exists) {
        if (!exists) {
          ws.send(JSON.stringify({
            action: "requestFileResponse",
            file: "File Not Found"
          }));
          return;
        }
        fs.readFile(filename, "binary", function (err, file) {
          ws.send(JSON.stringify({
            action: "requestFileResponse",
            file: file
          }));
        });
      });
    } else if (messageData.action == "requestRemoteFile") {
      request(messageData.url, function (err, res, body) {
        ws.send(JSON.stringify({
          action: "requestRemoteFileResponse",
          file: body
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
    } else if (messageData.action == "?") {
      ws.send(JSON.stringify({
        action: "?Response",
        responseText: "Options: \nrequestFileList    Returns list of hosted files\nrequestFile     Returns File requested\nrequestRemoteFile    Retrieves files from remote URL\nsaveFile    Saves file to server\n"
      }));
    }
  });
});
