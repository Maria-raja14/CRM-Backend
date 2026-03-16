// realtime/socket.js
import { Server } from "socket.io";
import Notification from "../models/notification.model.js";

// ✅ FIX: Removed Redis entirely.
// Redis pub/sub was crashing silently on live when Redis wasn't
// configured with auth or the right port — killing all socket delivery.
// Since this is a single-server deployment, in-memory map is sufficient.

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

    // Accept userId from auth (preferred) OR from event (fallback)
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

  // Don't add duplicate socket entries
  if (!connectedUsers[userId].some((s) => s.id === socket.id)) {
    connectedUsers[userId].push(socket);
  }

  console.log(`✅ User ${userId} connected (${connectedUsers[userId].length} socket(s))`);

  // Flush unread notifications from DB on connect/reconnect
  try {
    const unread = await Notification.find({ userId, read: false })
      .sort({ createdAt: 1 })
      .lean();

    if (unread.length > 0) {
      console.log(`📬 Flushing ${unread.length} unread to ${userId}`);
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
};//all finally working correct code..