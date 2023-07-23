const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = 3000;
let players = {};
app.use(express.static(__dirname + "/public"));
io.on("connection", (socket) => {
  console.log("New player connected: " + socket.id);
  players[socket.id] = {
    currDir: { x: 0, y: 0, z: 0 },
    currPos: { x: 0, y: 0, z: 0 },
  };
  io.emit("newPlayerJoined", players);

  socket.on("updatePlayerState", (data) => {
    if (players[socket.id]) {
      players[socket.id].currDir = data.direction;
      players[socket.id].currPos = data.position;
      io.emit("playerMoved", { id: socket.id, ...players[socket.id] });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Player ${socket.id} disconnected`);
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});
server.listen(port, () => {
  console.log("Server running on port " + port);
});
