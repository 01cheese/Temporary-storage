import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export const uploadToSupabase = async (file) => {
    const cleanName = file.originalname.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x00-\x7F]/g, "")
        .replace(/\s+/g, "_");

    const filename = `${Date.now()}-${cleanName}`;

    const { data, error } = await supabase.storage
        .from("files")
        .upload(filename, file.buffer);

    if (error) throw error;
    return data.path;
};

export const getSupabaseUrl = async (path, ttlInSeconds = process.env.TTL_IN_SECONDS) => {
    const { data, error } = await supabase.storage
        .from("files")
        .createSignedUrl(path, ttlInSeconds);

    if (error) throw error;
    return data.signedUrl;
};

export const deleteFromSupabase = async (path) => {
    const { error } = await supabase.storage.from("files").remove([path]);
    if (error) throw error;
};
