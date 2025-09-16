

// // socket.js
// import { Server } from "socket.io";
// import Redis from "ioredis";
// import Notification from "../models/notification.model.js"
// // ----- Redis for multi-server scaling -----
// const redisClient = new Redis();
// const redisPub = new Redis();
// const redisSub = new Redis();

// // ----- In-memory fallback for connected users -----
// export const connectedUsers = {}; // { userId: [socket1, socket2...] }

// // ----- Offline message queue (optional) -----
// const offlineMessages = {}; // { userId: [{ event, payload }, ...] }

// let io;

// // Initialize Socket.IO server
// export const initSocket = (server) => {
//   io = new Server(server, { cors: { origin: "*" } });

//   io.on("connection", (socket) => {
//     const { userId } = socket.handshake.auth;

//   console.log("🟢 Handshake userId:", socket.handshake.auth.userId);

//     if (userId) addUserSocket(userId, socket);

//     // Fallback login event
//     socket.on("user_connected", (uid) => {
//       if (uid) addUserSocket(uid, socket);
//     });

//     // User logout
//     socket.on("user_logout", (uid) => {
//       if (uid) removeUserSocket(uid, socket.id);
//       socket.disconnect(true);
//     });

//     // Handle disconnect
//     socket.on("disconnect", () => {
//       for (const [uid] of Object.entries(connectedUsers)) {
//         removeUserSocket(uid, socket.id);
//       }
//     });

//     console.log("🔌 New socket connected:", socket.id);
//   });

//   // Redis pub/sub for multi-instance broadcasting
//   redisSub.subscribe("socket_broadcast", (err, count) => {
//     if (err) console.error("Redis subscribe error:", err);
//   });

//   redisSub.on("message", (channel, message) => {
//     const { userId, event, payload } = JSON.parse(message);
//     notifyUser(userId, event, payload);
//   });
// };


// const addUserSocket = async (userId, socket) => {
//   if (!connectedUsers[userId]) connectedUsers[userId] = [];
//   connectedUsers[userId].push(socket);

//   console.log("✅ User connected:", userId);

//   // Send all unread notifications from DB
//   const unreadNotifs = await Notification.find({ userId, read: false }).sort({ createdAt: 1 });
//   unreadNotifs.forEach(n => {
//     socket.emit("new_notification", {
//       id: n._id,
//       text: n.text,
//       type: n.type,
//       meta: n.meta,
//       profileImage: n.profileImage,
//     });
//   });

//   // 🔥 Flush queued offline messages
//   if (offlineMessages[userId]?.length) {
//     offlineMessages[userId].forEach(msg => {
//       socket.emit(msg.event, msg.payload);
//       console.log(`📦 Delivered queued ${msg.event} -> User: ${userId}`);
//     });
//     delete offlineMessages[userId]; // clear after flush
//   }
// };


// // ----- Remove user socket -----
// const removeUserSocket = (userId, socketId) => {
//   if (!connectedUsers[userId]) return;
//   connectedUsers[userId] = connectedUsers[userId].filter((s) => s.id !== socketId);

//   if (connectedUsers[userId].length === 0) {
//     delete connectedUsers[userId];
//     console.log("🗑️ User removed completely:", userId);
//   }
// };

// // ----- Notify a single user -----
// export const notifyUser = (userId, event, payload) => {
//   const sockets = connectedUsers[userId];
//   if (!sockets?.length) {
//     console.log("❌ No active socket for user:", userId);

//     // Queue offline message
//     if (!offlineMessages[userId]) offlineMessages[userId] = [];
//     offlineMessages[userId].push({ event, payload });

//     return;
//   }
//   sockets.forEach((s) => s.emit(event, payload));
//   console.log("📩 Event sent:", event, "-> User:", userId);
// };

// // ----- Notify multiple admins/users -----
// export const notifyAdmins = (adminIds, event, payload) => {
//   adminIds.forEach((id) => {
//     // Publish to Redis for multi-server
//     redisPub.publish("socket_broadcast", JSON.stringify({ userId: id, event, payload }));
//   });
// };




import { Server } from "socket.io";
import Redis from "ioredis";
import Notification from "../models/notification.model.js";

// Redis setup
const redisClient = new Redis();
const redisPub = new Redis();
const redisSub = new Redis();

// In-memory connected users
export const connectedUsers = {};
const offlineMessages = {};

let io;

export const initSocket = (server) => {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    const { userId } = socket.handshake.auth;
    if (userId) addUserSocket(userId, socket);

    socket.on("user_connected", (uid) => uid && addUserSocket(uid, socket));
    socket.on("user_logout", (uid) => {
      if (uid) removeUserSocket(uid, socket.id);
      socket.disconnect(true);
    });

    socket.on("disconnect", () => {
      for (const uid of Object.keys(connectedUsers)) {
        removeUserSocket(uid, socket.id);
      }
    });

    console.log("🔌 New socket connected:", socket.id);
  });

  // Redis subscription
  redisSub.subscribe("socket_broadcast", (err) => {
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

  // Send unread notifications from DB
  const unread = await Notification.find({ userId, read: false }).sort({ createdAt: 1 });
  unread.forEach((n) =>
    socket.emit("new_notification", {
      _id: n._id,
      text: n.text,
      type: n.type,
      meta: n.meta,
      profileImage: n.profileImage,
      createdAt: n.createdAt,
    })
  );

  // Send offline messages
  if (offlineMessages[userId]?.length) {
    offlineMessages[userId].forEach((msg) => socket.emit(msg.event, msg.payload));
    delete offlineMessages[userId];
  }
};

const removeUserSocket = (userId, socketId) => {
  if (!connectedUsers[userId]) return;
  connectedUsers[userId] = connectedUsers[userId].filter((s) => s.id !== socketId);
  if (!connectedUsers[userId].length) {
    delete connectedUsers[userId];
    console.log("🗑️ User removed completely:", userId);
  }
};

// Notify a single user
export const notifyUser = (userId, event, payload) => {
  const sockets = connectedUsers[userId];
  if (!sockets?.length) {
    // queue offline
    if (!offlineMessages[userId]) offlineMessages[userId] = [];
    offlineMessages[userId].push({ event, payload });
    return;
  }
  sockets.forEach((s) => s.emit(event, payload));
  console.log("📩 Event sent:", event, "-> User:", userId);
};

// Notify multiple admins
export const notifyAdmins = (adminIds, event, payload) => {
  adminIds.forEach((id) => {
    redisPub.publish("socket_broadcast", JSON.stringify({ userId: id, event, payload }));
  });
};
