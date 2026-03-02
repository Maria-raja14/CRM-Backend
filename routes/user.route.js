// import express from "express";
// import indexControllers from "../controllers/index.controllers.js";
// import {
//   protect,
//   adminOrSales,
//   adminOrAssigned,
//   adminCreateOnly,
// } from "../middlewares/auth.middleware.js";
// // import upload from "../middlewares/upload.js";
// import upload from "../middlewares/upload.js";
// import User from "../models/user.model.js";
// const router = express.Router();

// router.post(
//   "/create",
//   protect,
//   adminCreateOnly,
//   upload.single("profileImage"),
//   indexControllers.usersController.createUser,
// );

// router.get(
//   "/",
//   protect,
//   adminCreateOnly,
//   indexControllers.usersController.getUsers,
// );

// router.get("/me", protect, indexControllers.usersController.getMe);

// router.put(
//   "/update-user/:id",
//   upload.single("profileImage"),
//   protect,
//   adminCreateOnly,
//   indexControllers.usersController.updateUser,
// );
// router.delete(
//   "/delete-user/:id",
//   protect,
//   adminCreateOnly,
//   indexControllers.usersController.deleteUser,
// );
// router.post("/login", indexControllers.usersController.loginUser);
// router.post("/logout", protect, indexControllers.usersController.logoutUser);

// router.put(
//   "/update-password",
//   protect,
//   indexControllers.usersController.updatePassword,
// );

// router.post(
//   "/forgot-password",
//   indexControllers.usersController.forgotPassword,
// );
// router.post(
//   "/reset-password/:token",
//   indexControllers.usersController.resetPassword,
// );
// router.get(
//   "/sales",
//   protect,
//   adminOrSales, // or adminOnly, depending on your needs
//   async (req, res) => {
//     try {
//       // Fetch all users and populate their role
//       const users = await User.find()
//         .populate("role", "name") // populate only the role name
//         .select("firstName lastName email role");

//       // Filter only sales users
//       const salesUsers = users.filter(
//         (u) => u.role?.name?.toLowerCase() === "sales",
//       );

//       res.json({ users: salesUsers });
//     } catch (error) {
//       console.error("❌ Error fetching sales users:", error);
//       res.status(500).json({ message: "Server error", error: error.message });
//     }
//   },
// );

// export default router;//original



import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import {
  protect,
  adminOrSales,
  adminOrAssigned,
  adminCreateOnly,
} from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.js";
import User from "../models/user.model.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// Auth routes (no protect needed)
// ─────────────────────────────────────────────────────────────
router.post("/login", indexControllers.usersController.loginUser);
router.post("/forgot-password", indexControllers.usersController.forgotPassword);
router.post("/reset-password/:token", indexControllers.usersController.resetPassword);

// ─────────────────────────────────────────────────────────────
// GET /api/users/me — any authenticated user can get own profile
// ─────────────────────────────────────────────────────────────
router.get("/me", protect, indexControllers.usersController.getMe);

// ─────────────────────────────────────────────────────────────
// GET /api/users
// ✅ FIXED: Changed adminCreateOnly → adminOrSales
// Sales users need this to see assigned-to info in the
// pipeline board. adminCreateOnly was returning 403 for them.
// ─────────────────────────────────────────────────────────────
router.get(
  "/",
  protect,
  adminOrSales,
  indexControllers.usersController.getUsers,
);

// ─────────────────────────────────────────────────────────────
// GET /api/users/sales — fetch only sales users (Admin or Sales)
// ─────────────────────────────────────────────────────────────
router.get(
  "/sales",
  protect,
  adminOrSales,
  async (req, res) => {
    try {
      const users = await User.find()
        .populate("role", "name")
        .select("firstName lastName email role");

      const salesUsers = users.filter(
        (u) => u.role?.name?.toLowerCase() === "sales"
      );

      res.json({ users: salesUsers });
    } catch (error) {
      console.error("❌ Error fetching sales users:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/users/create — Admin only
// ─────────────────────────────────────────────────────────────
router.post(
  "/create",
  protect,
  adminCreateOnly,
  upload.single("profileImage"),
  indexControllers.usersController.createUser,
);

// ─────────────────────────────────────────────────────────────
// PUT /api/users/update-user/:id — Admin only
// ─────────────────────────────────────────────────────────────
router.put(
  "/update-user/:id",
  protect,
  adminCreateOnly,
  upload.single("profileImage"),
  indexControllers.usersController.updateUser,
);

// ─────────────────────────────────────────────────────────────
// DELETE /api/users/delete-user/:id — Admin only
// ─────────────────────────────────────────────────────────────
router.delete(
  "/delete-user/:id",
  protect,
  adminCreateOnly,
  indexControllers.usersController.deleteUser,
);

// ─────────────────────────────────────────────────────────────
// POST /api/users/logout
// ─────────────────────────────────────────────────────────────
router.post("/logout", protect, indexControllers.usersController.logoutUser);

// ─────────────────────────────────────────────────────────────
// PUT /api/users/update-password
// ─────────────────────────────────────────────────────────────
router.put(
  "/update-password",
  protect,
  indexControllers.usersController.updatePassword,
);

export default router;