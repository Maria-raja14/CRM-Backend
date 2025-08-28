
import { Server } from "socket.io";

let io;
export const connectedUsers = {}; // { userId: [socket1, socket2...] }

export const initSocket = (server) => {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    const { userId } = socket.handshake.auth;

    if (userId) {
      addUserSocket(userId, socket);
    }

    socket.on("user_connected", (uid) => {
      if (uid) addUserSocket(uid, socket);
    });

    socket.on("user_logout", (uid) => {
      if (uid) removeUserSocket(uid, socket.id);
      socket.disconnect(true);
    });

    socket.on("disconnect", () => {
      for (const [uid] of Object.entries(connectedUsers)) {
        removeUserSocket(uid, socket.id);
      }
    });
  });
};

// Add user socket safely
const addUserSocket = (userId, socket) => {
  if (!connectedUsers[userId]) connectedUsers[userId] = [];
  if (!connectedUsers[userId].some((s) => s.id === socket.id)) {
    connectedUsers[userId].push(socket);
  }
   console.log(`✅ User connected: ${userId} | sockets: ${connectedUsers[userId].length}`);
  console.log("👥 All connected users now:", Object.keys(connectedUsers));
};

// Remove socket
const removeUserSocket = (userId, socketId) => {
  if (!connectedUsers[userId]) return;
  connectedUsers[userId] = connectedUsers[userId].filter((s) => s.id !== socketId);
  if (connectedUsers[userId].length === 0) {
    delete connectedUsers[userId];
    console.log("🗑️ User removed completely:", userId);
  }
};

// Notify single user
export const notifyUser = (userId, event, payload) => {
  const sockets = connectedUsers[userId];
  if (!sockets?.length) {
     console.log("❌ No active socket for user:", userId, "| Currently online:", Object.keys(connectedUsers));
    return;
  }
  sockets.forEach((s) => s.emit(event, payload));
  console.log("📩 Event sent:", event, "-> User:", userId);
};

// Notify multiple admins
export const notifyAdmins = (adminIds, event, payload) => {
  adminIds.forEach((id) => notifyUser(id, event, payload));
};
