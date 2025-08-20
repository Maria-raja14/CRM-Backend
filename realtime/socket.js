

import { Server } from "socket.io";

let io;
export const connectedUsers = {}; // { userId: [socket1, socket2...] }

export const initSocket = (server) => {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    const { userId } = socket.handshake.auth;

    // Handshake la userId iruntha add pannu
    if (userId) {
      addUserSocket(userId, socket);
    }

    // ✅ Explicit user_connected emit from client
    socket.on("user_connected", (uid) => {
      if (uid) {
        addUserSocket(uid, socket);
        console.log("✅ User registered:", uid);
      }
    });

    // ✅ Explicit logout emit from client
    socket.on("user_logout", (uid) => {
      if (uid) {
        removeUserSocket(uid, socket.id);
        console.log("🚪 User logged out:", uid);
      }
      socket.disconnect(true); // force disconnect socket
    });

    // ✅ Auto cleanup when browser/tab closes
    socket.on("disconnect", () => {
      for (const [uid, sockets] of Object.entries(connectedUsers)) {
        removeUserSocket(uid, socket.id);
      }
      console.log("⚠️ Socket disconnected:", socket.id);
    });
  });
};

// 👉 Helper: Add user socket safely
const addUserSocket = (userId, socket) => {
  if (!connectedUsers[userId]) {
    connectedUsers[userId] = [];
  }
  // prevent duplicate push
  if (!connectedUsers[userId].some((s) => s.id === socket.id)) {
    connectedUsers[userId].push(socket);
  }
  console.log("✅ User connected:", userId, "| sockets:", connectedUsers[userId].length);
};

// 👉 Helper: Remove socket from user
const removeUserSocket = (userId, socketId) => {
  if (!connectedUsers[userId]) return;

  connectedUsers[userId] = connectedUsers[userId].filter((s) => s.id !== socketId);

  if (connectedUsers[userId].length === 0) {
    delete connectedUsers[userId];
    console.log("🗑️ User removed completely:", userId);
  }
};

// 👉 Notify single user (all sockets of that user)
export const notifyUser = (userId, event, payload) => {
  const sockets = connectedUsers[userId];
  if (!sockets || sockets.length === 0) {
    console.log("❌ No active socket for user:", userId);
    return;
  }
  sockets.forEach((s) => s.emit(event, payload));
  console.log("📩 Event sent:", event, "-> User:", userId);
};

// 👉 Broadcast to multiple admins
export const notifyAdmins = (adminIds, event, payload) => {
  adminIds.forEach((id) => notifyUser(id, event, payload));
};
