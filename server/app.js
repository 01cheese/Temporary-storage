import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fileRoutes from "./routes/file.routes.js";
import File from "./model/fileModels.js";
import { deleteFromSupabase } from "./services/supabase.service.js";
import { redisClient } from "./services/redis.service.js";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors({
    origin: "http://localhost:3000"
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");
    })
    .catch((err) => console.error("1_MongoDB Error:", err));

app.use("/api/files", fileRoutes);

await redisClient.configSet("notify-keyspace-events", "Ex");

const subscriber = redisClient.duplicate();
await subscriber.connect();

subscriber.pSubscribe('__keyevent@0__:expired', async (key) => {
    try {
        if (key.startsWith('file:')) {
            const fileId = key.split(':')[1];
            const file = await File.findById(fileId).lean();
            if (file) {
                // Удаляем все файлы в supabase
                for (const path of file.supabasePaths) {
                    await deleteFromSupabase(path);
                }
                await File.findByIdAndDelete(fileId);
                console.log(`🗑️ Auto-deleted file group: ${file.originalNames.join(', ')}`);
            }
        }
    } catch (err) {
        console.error("Error auto-deleting file:", err.message);
    }
});



app.listen(5000, () => console.log("Server running on port 5000"));
