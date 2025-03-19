import express from "express";
import { 
    createPerson, 
    getAllPersons, 
    getPersonById, 
    updatePerson, 
    deletePerson 
} from "../controllers/person.controllers.js";

const router = express.Router();

router.post("/add", createPerson);
router.get("/", getAllPersons);
router.get("/:id", getPersonById);
router.put("/:id", updatePerson);
router.delete("/:id", deletePerson);

export default router;
