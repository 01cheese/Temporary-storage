import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fileRoutes from "./routes/file.routes.js";
import File from "./model/fileModels.js";
import { deleteFromSupabase } from "./services/supabase.service.js";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors({
    origin: "http://localhost:3000" // або process.env.CLIENT_ORIGIN
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");
    })
    .catch((err) => console.error("MongoDB Error:", err));

app.use("/api/files", fileRoutes);

// Очистка просрочених файлів кожні 5 хвилин
setInterval(async () => {
    try {
        const expiredFiles = await File.find({ expiresAt: { $lt: new Date() } }).lean();

        for (const file of expiredFiles) {
            for (const path of file.supabasePaths) {
                await deleteFromSupabase(path);
            }
            await File.findByIdAndDelete(file._id);
            console.log(`🧹 Auto-deleted expired file group: ${file.originalNames.join(", ")}`);
        }
    } catch (err) {
        console.error("Cleanup error:", err.message);
    }
}, 1000 * 60*5); // 5 min

app.listen(5000, () => console.log("Server running on port 5000"));
