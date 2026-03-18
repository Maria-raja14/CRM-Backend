// // routes/notification.routes.js
// import express from "express";
// import notificationController from "../controllers/notification.controller.js";

// const router = express.Router();

// // ✅ IMPORTANT: /bulk MUST come before /:id
// // If /:id is first, Express will match "bulk" as an ID and crash.

// // GET  /notifications/:userId  — fetch all notifications for a user
// router.get("/:userId", notificationController.getUserNotifications);

// // PATCH /notifications/read/:id — mark one notification as read
// router.patch("/read/:id", notificationController.markAsRead);

// // DELETE /notifications/bulk — delete multiple notifications by IDs
// // ✅ Must be declared BEFORE /:id route
// router.delete("/bulk", notificationController.bulkDeleteNotifications);

// // DELETE /notifications/:id — delete a single notification
// router.delete("/:id", notificationController.deleteNotification);

// export default router;//all finally working correct code..

// routes/notification.routes.js
import express from "express";
import notificationController from "../controllers/notification.controller.js";

const router = express.Router();

// ✅ CRITICAL ORDER: specific named routes MUST come before wildcard /:param routes
// If /:id or /:userId is first, Express matches "bulk", "read" etc. as IDs → wrong handler

// PATCH /notifications/read/:id — mark one notification as read
// ✅ Must be BEFORE /:userId so "read" isn't treated as a userId
router.patch("/read/:id", notificationController.markAsRead);

// DELETE /notifications/bulk — delete multiple notifications by IDs
// ✅ Must be BEFORE /:id so "bulk" isn't treated as a notification ID
router.delete("/bulk", notificationController.bulkDeleteNotifications);

// DELETE /notifications/:id — delete a single notification
router.delete("/:id", notificationController.deleteNotification);

// GET /notifications/:userId — fetch all notifications for a user
// ✅ Kept last among GET routes — no conflict since it's the only GET
router.get("/:userId", notificationController.getUserNotifications);

export default router;