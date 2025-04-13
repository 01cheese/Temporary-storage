import express from "express";
import multer from "multer";
import { uploadFile, getFile, checkFile } from "../controllers/file.controller.js";
import { downloadAllAsZip } from "../controllers/file.controller.js";


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.array("files"), uploadFile);
router.get("/:id", getFile);
router.get("/check/:id", checkFile);
router.get("/:id/zip", downloadAllAsZip);

export default router;
