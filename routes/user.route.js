



// import express from "express";
// import indexControllers from "../controllers/index.controllers.js";
// import {
//   protect,
//   adminOrSales,
//   adminOrAssigned,
//   adminCreateOnly,
// } from "../middlewares/auth.middleware.js";
// import upload from "../middlewares/upload.js";
// import User from "../models/user.model.js";

// const router = express.Router();

// // ─────────────────────────────────────────────────────────────
// // Auth routes (no protect needed)
// // ─────────────────────────────────────────────────────────────
// router.post("/login", indexControllers.usersController.loginUser);
// router.post("/forgot-password", indexControllers.usersController.forgotPassword);
// router.post("/reset-password/:token", indexControllers.usersController.resetPassword);

// // ─────────────────────────────────────────────────────────────
// // GET /api/users/me — any authenticated user can get own profile
// // ─────────────────────────────────────────────────────────────
// router.get("/me", protect, indexControllers.usersController.getMe);

// // ─────────────────────────────────────────────────────────────
// // GET /api/users
// // ✅ FIXED: Changed adminCreateOnly → adminOrSales
// // Sales users need this to see assigned-to info in the
// // pipeline board. adminCreateOnly was returning 403 for them.
// // ─────────────────────────────────────────────────────────────
// router.get(
//   "/",
//   protect,
//   adminOrSales,
//   indexControllers.usersController.getUsers,
// );

// // ─────────────────────────────────────────────────────────────
// // GET /api/users/sales — fetch only sales users (Admin or Sales)
// // ─────────────────────────────────────────────────────────────
// router.get(
//   "/sales",
//   protect,
//   adminOrSales,
//   async (req, res) => {
//     try {
//       const users = await User.find()
//         .populate("role", "name")
//         .select("firstName lastName email role");

//       const salesUsers = users.filter(
//         (u) => u.role?.name?.toLowerCase() === "sales"
//       );

//       res.json({ users: salesUsers });
//     } catch (error) {
//       console.error("❌ Error fetching sales users:", error);
//       res.status(500).json({ message: "Server error", error: error.message });
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────
// // POST /api/users/create — Admin only
// // ─────────────────────────────────────────────────────────────
// router.post(
//   "/create",
//   protect,
//   adminCreateOnly,
//   upload.single("profileImage"),
//   indexControllers.usersController.createUser,
// );

// // ─────────────────────────────────────────────────────────────
// // PUT /api/users/update-user/:id — Admin only
// // ─────────────────────────────────────────────────────────────
// router.put(
//   "/update-user/:id",
//   protect,
//   adminCreateOnly,
//   upload.single("profileImage"),
//   indexControllers.usersController.updateUser,
// );

// // ─────────────────────────────────────────────────────────────
// // DELETE /api/users/delete-user/:id — Admin only
// // ─────────────────────────────────────────────────────────────
// router.delete(
//   "/delete-user/:id",
//   protect,
//   adminCreateOnly,
//   indexControllers.usersController.deleteUser,
// );

// // ─────────────────────────────────────────────────────────────
// // POST /api/users/logout
// // ─────────────────────────────────────────────────────────────
// router.post("/logout", protect, indexControllers.usersController.logoutUser);

// // ─────────────────────────────────────────────────────────────
// // PUT /api/users/update-password
// // ─────────────────────────────────────────────────────────────
// router.put(
//   "/update-password",
//   protect,
//   indexControllers.usersController.updatePassword,
// );

// // GET /api/users/operations – fetch only operations users
// router.get(
//   "/operations",
//   protect,
//   adminOrSales, // or just protect; depends on who needs this list
//   indexControllers.usersController.getOperationsUsers
// );

// export default router;//original all work correctly..



import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import {
  protect,
  adminOrSales,
  adminOrAssigned,
  adminCreateOnly,
  adminOrManager,
  adminSalesAccountsOrManager,
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
// GET /api/users — Admin, Sales, Manager, Accounts
// ─────────────────────────────────────────────────────────────
router.get(
  "/",
  protect,
  adminSalesAccountsOrManager,
  indexControllers.usersController.getUsers
);

// ─────────────────────────────────────────────────────────────
// GET /api/users/sales — fetch only sales users
// ─────────────────────────────────────────────────────────────
router.get(
  "/sales",
  protect,
  adminSalesAccountsOrManager,
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
// ✅ GET /api/users/accounts — fetch only accounts users
// Admin or Manager can see accounts users list
// ─────────────────────────────────────────────────────────────
router.get(
  "/accounts",
  protect,
  adminOrManager,
  indexControllers.usersController.getAccountsUsers
);

// ─────────────────────────────────────────────────────────────
// GET /api/users/operations — fetch only operations users
// ─────────────────────────────────────────────────────────────
router.get(
  "/operations",
  protect,
  adminSalesAccountsOrManager,
  indexControllers.usersController.getOperationsUsers
);

// ─────────────────────────────────────────────────────────────
// POST /api/users/create — Admin only
// ─────────────────────────────────────────────────────────────
router.post(
  "/create",
  protect,
  adminCreateOnly,
  upload.single("profileImage"),
  indexControllers.usersController.createUser
);

// ─────────────────────────────────────────────────────────────
// PUT /api/users/update-user/:id — Admin only
// ─────────────────────────────────────────────────────────────
router.put(
  "/update-user/:id",
  protect,
  adminCreateOnly,
  upload.single("profileImage"),
  indexControllers.usersController.updateUser
);

// ─────────────────────────────────────────────────────────────
// DELETE /api/users/delete-user/:id — Admin only
// ─────────────────────────────────────────────────────────────
router.delete(
  "/delete-user/:id",
  protect,
  adminCreateOnly,
  indexControllers.usersController.deleteUser
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
  indexControllers.usersController.updatePassword
);

export default router;