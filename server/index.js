const path = require("path");
const express = require("express");
const socket = require("socket.io");

const app = express();

const port = process.env.PORT || 3000;
const io = socket(
  app.listen(port, () => console.log(`listening on port ${port}`))
);

app.use("/", express.static(path.join(__dirname, "../public")));

let connections = [];

io.on("connection", (socket) => {
  console.log(
    `Socket ${socket.id} has connected from address ${socket.handshake.address}.`
  );

  socket.on("join", async (user) => {
    if (!connections.includes(socket.id)) {
      connections.push({ id: socket.id, name: user.name });
    }

    io.emit("user list updated", connections);
  });

  socket.on("call user", (data) => {
    console.log(`user ${socket.id} is calling user ${data.to}`);
    io.to(data.to).emit("incoming call", {
      offer: data.offer,
      socket: socket.id,
    });
  });

  socket.on("accept call", (data) => {
    console.log("data", data);

    console.log(`user ${socket.id} has accepted a call from user ${data.from}`);

    io.to(data.from).emit("call accepted", {
      socket: socket.id,
      answer: data.answer,
    });
  });

  socket.on("reject call", (data) => {
    console.log(`user ${socket.id} has rejected a call from user ${data.from}`);
    io.to(data.from).emit("call rejected");
  });

  socket.on("disconnect", () => {
    connections = connections.filter((sck) => sck.id !== socket.id);
    io.emit("user list updated", connections);
  });
});
