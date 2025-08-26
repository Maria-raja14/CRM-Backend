// import express from "express";
// import indexControllers from "../controllers/index.controllers.js";
// import upload from "../middlewares/uploadMiddleware.js";

// const router = express.Router();

// router.post("/createTemp", upload.single("image"),indexControllers.templateController. createTemplate); // Handles image upload
// router.get("/readTemp",indexControllers.templateController. getTemplates);
// router.put("/updateTemp/:id",indexControllers.templateController.updateTemplate)
// router.delete("/deleteTemp/:id",indexControllers.templateController. deleteTemplate);

// export default router;


import express from "express";
import templateController from "../controllers/templateController.js";
import upload from "../middlewares/uploadMiddleware.js";
import indexControllers from "../controllers/index.controllers.js";

const router = express.Router();

router.post("/createTemp", upload.single("image"), indexControllers.templateController.createTemplate);
router.get("/readTemp", indexControllers.templateController.getTemplates);
router.get("/readTemp/:id", indexControllers.templateController.getTemplateById);
router.put("/updateTemp/:id", upload.single("image"), indexControllers.templateController.updateTemplate);
router.delete("/deleteTemp/:id", indexControllers.templateController.deleteTemplate);

export default router;