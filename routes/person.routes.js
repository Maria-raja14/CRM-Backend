import express from "express";
import indexControllers from "../controllers/index.controllers.js";

const router = express.Router();

router.post("/add", indexControllers.PersonController.createPerson);
router.get("/", indexControllers.PersonController.getAllPersons);
router.get("/:id", indexControllers.PersonController.getPersonById);
router.put("/:id", indexControllers.PersonController.updatePerson);
router.delete("/:id", indexControllers.PersonController.deletePerson);

export default router;
