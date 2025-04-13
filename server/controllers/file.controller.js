import File from "../model/fileModels.js";
import { uploadToSupabase, getSupabaseUrl } from "../services/supabase.service.js";
import archiver from "archiver";
import axios from "axios";
import stream from "stream";
import { promisify } from "util";

export const uploadFile = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        const ttl = parseInt(req.body.ttl) || process.env.TTL_IN_SECONDS;
        const expiresAt = new Date(Date.now() + ttl * 1000);
        const originalNames = [];
        const supabasePaths = [];

        for (const file of files) {
            const path = await uploadToSupabase(file);
            originalNames.push(file.originalname);
            supabasePaths.push(path);
        }

        const newFile = await File.create({ originalNames, supabasePaths, expiresAt });

        res.json({ link: `https://temporary-storage-f.onrender.com/open/${newFile._id}` });
    } catch (err) {
        console.error("Upload error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

export const getFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        const index = parseInt(req.query.index);

        if (!file || !file.supabasePaths[index]) return res.status(404).send("File not found");
        if (file.expiresAt < Date.now()) return res.status(410).send("Link expired");

        const ttl = Math.floor((file.expiresAt - Date.now()) / 1000);
        const url = await getSupabaseUrl(file.supabasePaths[index], ttl);

        const response = await axios({
            method: "get",
            url,
            responseType: "stream",
        });

        const filename = file.originalNames[index];
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", response.headers["content-type"]);

        // Проксіруємо файл напряму
        response.data.pipe(res);
    } catch (err) {
        console.error("File download error:", err.message);
        res.status(500).json({ error: "Download failed" });
    }
};

export const checkFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ valid: false, message: "File not found" });
        if (file.expiresAt < Date.now()) return res.status(410).json({ valid: false, message: "Link expired" });

        res.status(200).json({
            valid: true,
            message: "File exists",
            file: {
                originalNames: file.originalNames,
                supabasePaths: file.supabasePaths,
                expiresAt: file.expiresAt,
            }
        });
    } catch (err) {
        res.status(500).json({ valid: false, message: "Server error" });
    }
};

export const downloadAllAsZip = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).send("File not found");
        if (file.expiresAt < Date.now()) return res.status(410).send("Link expired");

        const zip = archiver("zip", { zlib: { level: 9 } });
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="files-${file._id}.zip"`);

        zip.pipe(res);

        for (let i = 0; i < file.supabasePaths.length; i++) {
            const path = file.supabasePaths[i];
            const ttl = Math.floor((file.expiresAt - Date.now()) / 1000);
            const url = await getSupabaseUrl(path, ttl);
            const response = await axios.get(url, { responseType: "stream" });

            const fileName = file.originalNames[i] || `file-${i}`;
            zip.append(response.data, { name: fileName });
        }

        await zip.finalize();
    } catch (err) {
        console.error("ZIP error:", err.message);
        res.status(500).send("Server error");
    }
};
