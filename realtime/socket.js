
// import { Server } from "socket.io";

// let io;
// export const connectedUsers = {}; // { userId: [socket1, socket2...] }

// export const initSocket = (server) => {
//   io = new Server(server, { cors: { origin: "*" } });

//   io.on("connection", (socket) => {
//     const { userId } = socket.handshake.auth;

//     if (userId) {
//       addUserSocket(userId, socket);
//     }

//     socket.on("user_connected", (uid) => {
//       if (uid) addUserSocket(uid, socket);
//     });

//     socket.on("user_logout", (uid) => {
//       if (uid) removeUserSocket(uid, socket.id);
//       socket.disconnect(true);
//     });

//     socket.on("disconnect", () => {
//       for (const [uid] of Object.entries(connectedUsers)) {
//         removeUserSocket(uid, socket.id);
//       }
//     });
//   });
// };

// // Add user socket safely
// const addUserSocket = (userId, socket) => {
//   if (!connectedUsers[userId]) connectedUsers[userId] = [];
//   if (!connectedUsers[userId].some((s) => s.id === socket.id)) {
//     connectedUsers[userId].push(socket);
//   }
//    console.log(`✅ User connected: ${userId} | sockets: ${connectedUsers[userId].length}`);
//   console.log("👥 All connected users now:", Object.keys(connectedUsers));
// };

// // Remove socket
// const removeUserSocket = (userId, socketId) => {
//   if (!connectedUsers[userId]) return;
//   connectedUsers[userId] = connectedUsers[userId].filter((s) => s.id !== socketId);
//   if (connectedUsers[userId].length === 0) {
//     delete connectedUsers[userId];
//     console.log("🗑️ User removed completely:", userId);
//   }
// };

// // Notify single user
// export const notifyUser = (userId, event, payload) => {
//   const sockets = connectedUsers[userId];
//   if (!sockets?.length) {
//      console.log("❌ No active socket for user:", userId, "| Currently online:", Object.keys(connectedUsers));
//     return;
//   }
//   sockets.forEach((s) => s.emit(event, payload));
//   console.log("📩 Event sent:", event, "-> User:", userId);
// };

// // Notify multiple admins
// export const notifyAdmins = (adminIds, event, payload) => {
//   adminIds.forEach((id) => notifyUser(id, event, payload));
// };


// socket.js
import { Server } from "socket.io";
import Redis from "ioredis";
import Notification from "../models/notification.model.js"
// ----- Redis for multi-server scaling -----
const redisClient = new Redis();
const redisPub = new Redis();
const redisSub = new Redis();

// ----- In-memory fallback for connected users -----
export const connectedUsers = {}; // { userId: [socket1, socket2...] }

// ----- Offline message queue (optional) -----
const offlineMessages = {}; // { userId: [{ event, payload }, ...] }

let io;

// Initialize Socket.IO server
export const initSocket = (server) => {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    const { userId } = socket.handshake.auth;

    if (userId) addUserSocket(userId, socket);

    // Fallback login event
    socket.on("user_connected", (uid) => {
      if (uid) addUserSocket(uid, socket);
    });

    // User logout
    socket.on("user_logout", (uid) => {
      if (uid) removeUserSocket(uid, socket.id);
      socket.disconnect(true);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      for (const [uid] of Object.entries(connectedUsers)) {
        removeUserSocket(uid, socket.id);
      }
    });

    console.log("🔌 New socket connected:", socket.id);
  });

  // Redis pub/sub for multi-instance broadcasting
  redisSub.subscribe("socket_broadcast", (err, count) => {
    if (err) console.error("Redis subscribe error:", err);
  });

  redisSub.on("message", (channel, message) => {
    const { userId, event, payload } = JSON.parse(message);
    notifyUser(userId, event, payload);
  });
};


const addUserSocket = async (userId, socket) => {
  if (!connectedUsers[userId]) connectedUsers[userId] = [];
  connectedUsers[userId].push(socket);

  console.log("✅ User connected:", userId);

  // Send all unread notifications from DB
  const unreadNotifs = await Notification.find({ userId, read: false }).sort({ createdAt: 1 });
  unreadNotifs.forEach(n => {
    socket.emit("new_notification", {
      id: n._id,
      text: n.text,
      type: n.type,
      meta: n.meta,
    });
  });
};

// ----- Remove user socket -----
const removeUserSocket = (userId, socketId) => {
  if (!connectedUsers[userId]) return;
  connectedUsers[userId] = connectedUsers[userId].filter((s) => s.id !== socketId);

  if (connectedUsers[userId].length === 0) {
    delete connectedUsers[userId];
    console.log("🗑️ User removed completely:", userId);
  }
};

// ----- Notify a single user -----
export const notifyUser = (userId, event, payload) => {
  const sockets = connectedUsers[userId];
  if (!sockets?.length) {
    console.log("❌ No active socket for user:", userId);

    // Queue offline message
    if (!offlineMessages[userId]) offlineMessages[userId] = [];
    offlineMessages[userId].push({ event, payload });

    return;
  }
  sockets.forEach((s) => s.emit(event, payload));
  console.log("📩 Event sent:", event, "-> User:", userId);
};

// ----- Notify multiple admins/users -----
export const notifyAdmins = (adminIds, event, payload) => {
  adminIds.forEach((id) => {
    // Publish to Redis for multi-server
    redisPub.publish("socket_broadcast", JSON.stringify({ userId: id, event, payload }));
  });
};
