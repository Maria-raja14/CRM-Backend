import { Server } from "socket.io";

let io;
export const connectedUsers = {}; // userId => socket

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
     const { userId } = socket.handshake.query;
  console.log("User connected:", userId);

  socket.on("user_connected", (uid) => {
    console.log("User registered for notifications:", uid);
  });

  // Example: emit a follow-up notification to this user
  setTimeout(() => {
    socket.emit("followup:due", { message: "Follow-up is due!" });
  }, 5000);
    socket.on("disconnect", () => {
      console.log("User disconnected:", userId);
      delete connectedUsers[userId];
    });
  });
};

export const notifyUser = (userId, event, payload) => {
  console.log("Sending notification to", userId, payload); // check payload
  const userSocket = connectedUsers[userId];
  if (userSocket) {
    userSocket.emit(event, payload);
  }
};
