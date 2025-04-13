import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    originalNames: [String],
    supabasePaths: [String],
    expiresAt: Date,
});

// fileSchema.index({ expiresAt: 1 }, {expiresAfterSeconds: 0 });

export default mongoose.model("fileModels", fileSchema);
