// // realtime/socket.js
// import { Server } from "socket.io";
// import Notification from "../models/notification.model.js";

// export const connectedUsers = {};
// let io;

// export const initSocket = (server) => {
//   io = new Server(server, {
//     cors: {
//       origin: "*",
//       methods: ["GET", "POST"],
//       credentials: false,
//     },
//     transports: ["websocket", "polling"],
//     pingTimeout:  60000,
//     pingInterval: 25000,
//   });

//   io.on("connection", (socket) => {
//     console.log("🔌 Socket connected:", socket.id, "| transport:", socket.conn.transport.name);

//     const authUserId = socket.handshake.auth?.userId;
//     if (authUserId) addUserSocket(String(authUserId), socket);

//     socket.on("user_connected", (uid) => {
//       if (uid) {
//         console.log("📡 user_connected event:", uid);
//         addUserSocket(String(uid), socket);
//       }
//     });

//     socket.on("user_logout", (uid) => {
//       if (uid) removeUserSocket(String(uid), socket.id);
//       socket.disconnect(true);
//     });

//     socket.on("disconnect", (reason) => {
//       console.log("❌ Socket disconnected:", socket.id, reason);
//       for (const uid of Object.keys(connectedUsers)) {
//         removeUserSocket(uid, socket.id);
//       }
//     });
//   });
// };

// // ── Helpers ────────────────────────────────────────────────────────────────

// const addUserSocket = async (userId, socket) => {
//   if (!connectedUsers[userId]) connectedUsers[userId] = [];

//   if (!connectedUsers[userId].some((s) => s.id === socket.id)) {
//     connectedUsers[userId].push(socket);
//   }

//   console.log(`✅ User ${userId} connected (${connectedUsers[userId].length} socket(s))`);

//   // ✅ FIX: Only flush TODAY's unread notifications on reconnect.
//   // Old notifications (yesterday / earlier) must NOT be sent.
//   // We use startOfToday as the cutoff — anything created before
//   // today's midnight is ignored entirely.
//   try {
//     const startOfToday = new Date();
//     startOfToday.setHours(0, 0, 0, 0); // midnight of current day

//     const now = new Date();

//     const unread = await Notification.find({
//       userId,
//       read: false,
//       createdAt: { $gte: startOfToday }, // ✅ today only
//       $or: [
//         { expiresAt: { $exists: false } },
//         { expiresAt: { $gte: now } },     // ✅ not yet expired
//       ],
//     })
//       .sort({ createdAt: 1 })
//       .lean();

//     if (unread.length > 0) {
//       console.log(`📬 Flushing ${unread.length} unread (today only) to ${userId}`);
//       unread.forEach((n) =>
//         socket.emit("new_notification", {
//           _id:          n._id,
//           text:         n.text,
//           type:         n.type,
//           meta:         n.meta,
//           profileImage: n.profileImage,
//           createdAt:    n.createdAt,
//           read:         n.read,
//         })
//       );
//     }
//   } catch (err) {
//     console.error("❌ Error flushing notifications:", err.message);
//   }
// };

// const removeUserSocket = (userId, socketId) => {
//   if (!connectedUsers[userId]) return;
//   connectedUsers[userId] = connectedUsers[userId].filter((s) => s.id !== socketId);
//   if (!connectedUsers[userId].length) {
//     delete connectedUsers[userId];
//     console.log(`🗑️ User ${userId} fully disconnected`);
//   }
// };

// export const notifyUser = (userId, event, payload) => {
//   const uid     = String(userId);
//   const sockets = connectedUsers[uid];

//   if (!sockets?.length) {
//     console.log(`📭 User ${uid} offline — saved to DB only`);
//     return;
//   }

//   console.log(`📩 Emitting "${event}" → user ${uid} (${sockets.length} socket(s))`);
//   sockets.forEach((s) => {
//     if (s.connected) s.emit(event, payload);
//   });
// };

// export const notifyAdmins = (adminIds, event, payload) => {
//   adminIds.forEach((id) => notifyUser(id, event, payload));
// };// all work correct notification come correctly ...


// realtime/socket.js
import { Server } from "socket.io";
import Notification from "../models/notification.model.js";

export const connectedUsers = {};
let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: false,
    },
    transports: ["websocket", "polling"],
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id, "| transport:", socket.conn.transport.name);

    const authUserId = socket.handshake.auth?.userId;
    if (authUserId) addUserSocket(String(authUserId), socket);

    socket.on("user_connected", (uid) => {
      if (uid) {
        console.log("📡 user_connected event:", uid);
        addUserSocket(String(uid), socket);
      }
    });

    socket.on("user_logout", (uid) => {
      if (uid) removeUserSocket(String(uid), socket.id);
      socket.disconnect(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", socket.id, reason);
      for (const uid of Object.keys(connectedUsers)) {
        removeUserSocket(uid, socket.id);
      }
    });
  });
};

// ── Helpers ────────────────────────────────────────────────────────────────

const addUserSocket = async (userId, socket) => {
  if (!connectedUsers[userId]) connectedUsers[userId] = [];

  if (!connectedUsers[userId].some((s) => s.id === socket.id)) {
    connectedUsers[userId].push(socket);
  }

  console.log(`✅ User ${userId} connected (${connectedUsers[userId].length} socket(s))`);

  // ✅ FIX: Flush only TODAY's unread notifications that are NOT expired.
  //
  //    Rules (must ALL be true to flush a notification):
  //      1. createdAt >= today midnight  → blocks any yesterday / older docs
  //      2. expiresAt exists             → legacy docs without expiresAt are skipped
  //      3. expiresAt >= now             → already-expired docs are skipped
  //      4. read === false               → only unread ones
  //
  //    This makes the socket flush 100% consistent with getUserNotifications.
  try {
    const now = new Date();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // midnight of current day

    const unread = await Notification.find({
      userId,
      read:      false,
      createdAt: { $gte: startOfToday },      // ✅ today only — no past dates
      expiresAt: { $exists: true, $gte: now }, // ✅ must exist and not be expired
    })
      .sort({ createdAt: 1 })
      .lean();

    if (unread.length > 0) {
      console.log(`📬 Flushing ${unread.length} unread (today, not expired) to ${userId}`);
      unread.forEach((n) =>
        socket.emit("new_notification", {
          _id:          n._id,
          text:         n.text,
          type:         n.type,
          meta:         n.meta,
          profileImage: n.profileImage,
          createdAt:    n.createdAt,
          read:         n.read,
        })
      );
    }
  } catch (err) {
    console.error("❌ Error flushing notifications:", err.message);
  }
};

const removeUserSocket = (userId, socketId) => {
  if (!connectedUsers[userId]) return;
  connectedUsers[userId] = connectedUsers[userId].filter((s) => s.id !== socketId);
  if (!connectedUsers[userId].length) {
    delete connectedUsers[userId];
    console.log(`🗑️ User ${userId} fully disconnected`);
  }
};

export const notifyUser = (userId, event, payload) => {
  const uid     = String(userId);
  const sockets = connectedUsers[uid];

  if (!sockets?.length) {
    console.log(`📭 User ${uid} offline — saved to DB only`);
    return;
  }

  console.log(`📩 Emitting "${event}" → user ${uid} (${sockets.length} socket(s))`);
  sockets.forEach((s) => {
    if (s.connected) s.emit(event, payload);
  });
};

export const notifyAdmins = (adminIds, event, payload) => {
  adminIds.forEach((id) => notifyUser(id, event, payload));
};