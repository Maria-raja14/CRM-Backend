// import { Server } from "socket.io";

// let io;
// export const connectedUsers = {}; // userId => socket

// export const initSocket = (server) => {
//   io = new Server(server, {
//     cors: { origin: "*" },
//   });

//   io.on("connection", (socket) => {
//      const { userId } = socket.handshake.query;
//   console.log("User connected:", userId);

//   socket.on("user_connected", (uid) => {
//     console.log("User registered for notifications:", uid);
//   });

//   // Example: emit a follow-up notification to this user
//   setTimeout(() => {
//     socket.emit("followup:due", { message: "Follow-up is due!" });
//   }, 5000);
//     socket.on("disconnect", () => {
//       console.log("User disconnected:", userId);
//       delete connectedUsers[userId];
//     });
//   });
// };

// export const notifyUser = (userId, event, payload) => {
//   console.log("Sending notification to", userId, payload); // check payload
//   const userSocket = connectedUsers[userId];
//   if (userSocket) {
//     userSocket.emit(event, payload);
//   }
// };



import { Server } from "socket.io";

let io;
export const connectedUsers = {}; // { userId: socket }

export const initSocket = (server) => {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    const { userId } = socket.handshake.auth;
    if (userId) {
      connectedUsers[userId] = socket;
      console.log("✅ User connected:", userId);
    }

    socket.on("user_connected", (uid) => {
      if (uid) {
        connectedUsers[uid] = socket;
        console.log("User registered for notifications:", uid);
      }
    });

    socket.on("disconnect", () => {
      // remove any mapping that matches this socket
      for (const [uid, s] of Object.entries(connectedUsers)) {
        if (s.id === socket.id) delete connectedUsers[uid];
      }
    });
  });
};

// export const notifyUser = (userId, event, payload) => {
//   const s = connectedUsers[userId];
//   if (s) s.emit(event, payload);
// };

export const notifyUser = (userId, event, payload) => {
  const s = connectedUsers[userId];
  if (!s) {
    console.log("❌ Socket for userId not found:", userId);
    return;
  }
  console.log("✅ Emitting event to user:", userId, payload);
  s.emit(event, payload);
};
