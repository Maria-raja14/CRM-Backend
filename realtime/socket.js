// import { Server } from "socket.io";
// import Redis from "ioredis";
// import Notification from "../models/notification.model.js";

// // Redis setup
// const redisClient = new Redis();
// const redisPub = new Redis();
// const redisSub = new Redis();

// // In-memory connected users
// export const connectedUsers = {};
// const offlineMessages = {};

// let io;

// export const initSocket = (server) => {
//   io = new Server(server, { cors: { origin: "*" } });

//   io.on("connection", (socket) => {
//     const { userId } = socket.handshake.auth;
//     if (userId) addUserSocket(userId, socket);

//     socket.on("user_connected", (uid) => uid && addUserSocket(uid, socket));
//     socket.on("user_logout", (uid) => {
//       if (uid) removeUserSocket(uid, socket.id);
//       socket.disconnect(true);
//     });

//     socket.on("disconnect", () => {
//       for (const uid of Object.keys(connectedUsers)) {
//         removeUserSocket(uid, socket.id);
//       }
//     });

//     console.log("🔌 New socket connected:", socket.id);
//   });

//   // Redis subscription
//   redisSub.subscribe("socket_broadcast", (err) => {
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

//   // Send unread notifications from DB
//   // const unread = await Notification.find({ userId, read: false }).sort({ createdAt: 1 });
//   const unread = await Notification.find({
//   userId,
//   read: false,
//   expiresAt: { $gte: new Date() }
// }).limit(50);
//   unread.forEach((n) =>
//     socket.emit("new_notification", {
//       _id: n._id,
//       text: n.text,
//       type: n.type,
//       meta: n.meta,
//       profileImage: n.profileImage,
//       createdAt: n.createdAt,
//     })
//   );

//   // Send offline messages
//   if (offlineMessages[userId]?.length) {
//     offlineMessages[userId].forEach((msg) => socket.emit(msg.event, msg.payload));
//     delete offlineMessages[userId];
//   }
// };

// const removeUserSocket = (userId, socketId) => {
//   if (!connectedUsers[userId]) return;
//   connectedUsers[userId] = connectedUsers[userId].filter((s) => s.id !== socketId);
//   if (!connectedUsers[userId].length) {
//     delete connectedUsers[userId];
//     console.log("🗑️ User removed completely:", userId);
//   }
// };

// // Notify a single user
// export const notifyUser = (userId, event, payload) => {
//   const sockets = connectedUsers[userId];
//   if (!sockets?.length) {
//     // queue offline
//     if (!offlineMessages[userId]) offlineMessages[userId] = [];
//     offlineMessages[userId].push({ event, payload });
//     return;
//   }
//   sockets.forEach((s) => s.emit(event, payload));
//   console.log("📩 Event sent:", event, "-> User:", userId);
// };

// // Notify multiple admins
// export const notifyAdmins = (adminIds, event, payload) => {
//   adminIds.forEach((id) => {
//     redisPub.publish("socket_broadcast", JSON.stringify({ userId: id, event, payload }));
//   });
// };//original



// import { Server } from "socket.io";
// import Redis from "ioredis";
// import Notification from "../models/notification.model.js";

// // Redis setup
// const redisClient = new Redis();
// const redisPub = new Redis();
// const redisSub = new Redis();

// // In-memory connected users
// export const connectedUsers = {};

// let io;

// export const initSocket = (server) => {
//   io = new Server(server, { cors: { origin: "*" } });

//   io.on("connection", (socket) => {
//     const { userId } = socket.handshake.auth;
//     if (userId) addUserSocket(userId, socket);

//     socket.on("user_connected", (uid) => uid && addUserSocket(uid, socket));
//     socket.on("user_logout", (uid) => {
//       if (uid) removeUserSocket(uid, socket.id);
//       socket.disconnect(true);
//     });

//     socket.on("disconnect", () => {
//       for (const uid of Object.keys(connectedUsers)) {
//         removeUserSocket(uid, socket.id);
//       }
//     });

//     console.log("🔌 New socket connected:", socket.id);
//   });

//   // Redis subscription
//   redisSub.subscribe("socket_broadcast", (err) => {
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

//   // Send unread notifications from DB (no offline messages)
//   const unread = await Notification.find({ userId, read: false }).sort({ createdAt: 1 });
//   unread.forEach((n) =>
//     socket.emit("new_notification", {
//       _id: n._id,
//       text: n.text,
//       type: n.type,
//       meta: n.meta,
//       profileImage: n.profileImage,
//       createdAt: n.createdAt,
//     })
//   );
// };

// const removeUserSocket = (userId, socketId) => {
//   if (!connectedUsers[userId]) return;
//   connectedUsers[userId] = connectedUsers[userId].filter((s) => s.id !== socketId);
//   if (!connectedUsers[userId].length) {
//     delete connectedUsers[userId];
//     console.log("🗑️ User removed completely:", userId);
//   }
// };

// // Notify a single user – if offline, do nothing (DB already has it)
// export const notifyUser = (userId, event, payload) => {
//   const sockets = connectedUsers[userId];
//   if (!sockets?.length) {
//     // User offline → skip (no queue)
//     return;
//   }
//   sockets.forEach((s) => s.emit(event, payload));
//   console.log("📩 Event sent:", event, "-> User:", userId);
// };

// // Notify multiple admins
// export const notifyAdmins = (adminIds, event, payload) => {
//   adminIds.forEach((id) => {
//     redisPub.publish("socket_broadcast", JSON.stringify({ userId: id, event, payload }));
//   });
// };//all work perfectly..


import { Server } from "socket.io";
import Notification from "../models/notification.model.js";

// In-memory map: userId → Socket[]
export const connectedUsers = {};

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    const { userId } = socket.handshake.auth;

    if (userId) addUserSocket(userId, socket);

    socket.on("user_connected", (uid) => {
      if (uid) addUserSocket(uid, socket);
    });

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
};

// ── Helpers ────────────────────────────────────────────────────────────────

const addUserSocket = async (userId, socket) => {
  if (!connectedUsers[userId]) connectedUsers[userId] = [];
  connectedUsers[userId].push(socket);
  console.log("✅ User connected:", userId);

  // ✅ FIX: Flush unread notifications from DB when user (re)connects.
  // This is what makes notifications appear on page-load / reconnect
  // without a separate REST call.
  try {
    const unread = await Notification.find({ userId, read: false })
      .sort({ createdAt: 1 })
      .lean();

    unread.forEach((n) =>
      socket.emit("new_notification", {
        _id:          n._id,
        text:         n.text,
        type:         n.type,
        meta:         n.meta,
        profileImage: n.profileImage,
        createdAt:    n.createdAt,
      })
    );

    console.log(`📬 Sent ${unread.length} unread notifications to user ${userId}`);
  } catch (err) {
    console.error("❌ Error sending unread notifications:", err.message);
  }
};

const removeUserSocket = (userId, socketId) => {
  if (!connectedUsers[userId]) return;

  connectedUsers[userId] = connectedUsers[userId].filter(
    (s) => s.id !== socketId
  );

  if (!connectedUsers[userId].length) {
    delete connectedUsers[userId];
    console.log("🗑️ User disconnected completely:", userId);
  }
};

/**
 * Send a real-time event to a specific user.
 * If the user is offline the notification is already persisted in DB
 * and will be delivered on next connect via addUserSocket().
 */
export const notifyUser = (userId, event, payload) => {
  const sockets = connectedUsers[String(userId)];

  if (!sockets?.length) {
    console.log(`📭 User ${userId} offline — notification stored in DB`);
    return;
  }

  sockets.forEach((s) => s.emit(event, payload));
  console.log(`📩 Event "${event}" sent to user ${userId}`);
};

/**
 * Broadcast an event to multiple users (e.g. all admins).
 */
export const notifyAdmins = (adminIds, event, payload) => {
  adminIds.forEach((id) => notifyUser(id, event, payload));
};