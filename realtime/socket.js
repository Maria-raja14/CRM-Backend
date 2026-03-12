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
// };//work perfect..


import { Server } from "socket.io";
import Redis from "ioredis";
import Notification from "../models/notification.model.js";

const REDIS_ENABLED = process.env.REDIS_ENABLED === "true";

let redisPub;
let redisSub;

if (REDIS_ENABLED) {
  redisPub = new Redis(process.env.REDIS_URL);
  redisSub = new Redis(process.env.REDIS_URL);
}

export const connectedUsers = {};

let io;

export const initSocket = (server) => {

  io = new Server(server, {
    cors: { origin: "*" },
  });

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

      for (const uid of Object.keys(connectedUsers)) {

        removeUserSocket(uid, socket.id);

      }

    });

    console.log("🔌 Socket connected:", socket.id);

  });

  // Redis subscribe
  if (REDIS_ENABLED) {

    redisSub.subscribe("socket_broadcast");

    redisSub.on("message", (channel, message) => {

      const { userId, event, payload } = JSON.parse(message);

      sendToLocalSockets(userId, event, payload);

    });

  }

};

/*
|--------------------------------------------------------------------------
| Add socket connection
|--------------------------------------------------------------------------
*/

const addUserSocket = async (userId, socket) => {

  if (!connectedUsers[userId]) {

    connectedUsers[userId] = [];

  }

  connectedUsers[userId].push(socket);

  console.log("✅ User connected:", userId);

  // Send unread notifications

  const unread = await Notification.find({
    userId,
    read: false,
  }).sort({ createdAt: 1 });

  unread.forEach((n) => {

    socket.emit("new_notification", {

      _id: n._id,
      text: n.text,
      type: n.type,
      meta: n.meta,
      profileImage: n.profileImage,
      createdAt: n.createdAt,

    });

  });

};

/*
|--------------------------------------------------------------------------
| Remove socket
|--------------------------------------------------------------------------
*/

const removeUserSocket = (userId, socketId) => {

  if (!connectedUsers[userId]) return;

  connectedUsers[userId] = connectedUsers[userId].filter(
    (s) => s.id !== socketId
  );

  if (!connectedUsers[userId].length) {

    delete connectedUsers[userId];

    console.log("🗑️ User removed:", userId);

  }

};

/*
|--------------------------------------------------------------------------
| Send event to local sockets
|--------------------------------------------------------------------------
*/

const sendToLocalSockets = (userId, event, payload) => {

  const sockets = connectedUsers[userId];

  if (!sockets?.length) return;

  sockets.forEach((s) => s.emit(event, payload));

};

/*
|--------------------------------------------------------------------------
| Public notify function
|--------------------------------------------------------------------------
*/

export const notifyUser = (userId, event, payload) => {

  // Send to local sockets
  sendToLocalSockets(userId, event, payload);

  // Broadcast to other servers via Redis
  if (REDIS_ENABLED && redisPub) {

    redisPub.publish(
      "socket_broadcast",
      JSON.stringify({ userId, event, payload })
    );

  }

};

/*
|--------------------------------------------------------------------------
| Notify multiple admins
|--------------------------------------------------------------------------
*/

export const notifyAdmins = (adminIds, event, payload) => {

  adminIds.forEach((id) => {

    notifyUser(id, event, payload);

  });

};