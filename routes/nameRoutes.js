// const express = require("express");
import express from "express"

const router = express.Router();
 import indexControllers from "../controllers/index.controllers.js";

router.post("/create",indexControllers.nameController. createName);
router.get("/getName",indexControllers.nameController. getNames);
router.get("/getNameById/:id",indexControllers.nameController. getNameById);
router.put("/updateName/:id",indexControllers.nameController. updateName);
router.delete("/deleteName/:id",indexControllers.nameController. deleteName);

export default router
