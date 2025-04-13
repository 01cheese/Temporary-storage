import File from "../model/fileModels.js";
import { uploadToSupabase, getSupabaseUrl } from "../services/supabase.service.js";
import { redisClient } from "../services/redis.service.js";

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

        const newFile = await File.create({
            originalNames,
            supabasePaths,
            expiresAt,
        });

        await redisClient.set(`file:${newFile._id}`, "1", { EX: ttl });

        res.json({ link: `http://localhost:3000/open/${newFile._id}` });
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
        res.redirect(url);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


export const checkFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ valid: false, message: "File not found" });
        }
        if (file.expiresAt < Date.now()) {
            return res.status(410).json({ valid: false, message: "Link expired" });
        }

        res.status(200).json({
            valid: true,
            message: "File exists",
            file: {
                originalNames: file.originalNames,
                supabasePaths: file.supabasePaths,
                expiresAt: file.expiresAt, // timer
                            }
        });


    } catch (err) {
        res.status(500).json({ valid: false, message: "Server error" });
    }
};
