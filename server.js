const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = 3000;

app.use(express.static(__dirname + "/public"));
io.on("connection", (socket) => {
  console.log("New player connected: " + socket.id);
});
server.listen(port, () => {
  console.log("Server running on port " + port);
});
