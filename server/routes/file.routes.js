import express from "express";
import multer from "multer";
import { uploadFile, getFile, checkFile } from "../controllers/file.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.array("files"), uploadFile);
router.get("/:id", getFile);
router.get("/check/:id", checkFile); // ✅

export default router;
