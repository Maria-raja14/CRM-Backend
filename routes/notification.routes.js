// routes/notification.routes.js
import express from "express";
import notificationController from "../controllers/notification.controller.js";

const router = express.Router();

// GET /notifications/:userId
router.get("/:userId", notificationController.getUserNotifications);

// PATCH /notifications/read/:id
router.patch("/read/:id", notificationController.markAsRead);

// DELETE /notifications/:id
router.delete("/:id", notificationController.deleteNotification);

export default router;
