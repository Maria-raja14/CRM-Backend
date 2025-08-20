
// import express from "express";
// import indexControllers from "../controllers/index.controllers.js";
// import { protect, adminOnly } from "../middlewares/auth.middleware.js";
// import upload from "../middlewares/upload.js";

// const router = express.Router();

// router.post("/create",upload.single("profileImage"), protect, adminOnly, indexControllers.usersController.createUser);
// router.get("/", protect, adminOnly, indexControllers.usersController.getUsers);
// router.post("/login", indexControllers.usersController.loginUser);

// export default router;


import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import { protect, adminOnly } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/create", upload.single("profileImage"), protect, adminOnly, indexControllers.usersController.createUser);
router.get("/", protect, adminOnly, indexControllers.usersController.getUsers);
router.put("/update-user/:id", upload.single("profileImage"), protect, adminOnly, indexControllers.usersController.updateUser);
router.delete("/delete-user/:id", protect, adminOnly, indexControllers.usersController.deleteUser);
router.post("/login", indexControllers.usersController.loginUser);

export default router;