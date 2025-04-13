import React, { useState } from "react";
import { Dropzone, FileMosaic } from "@files-ui/react";
import "./cart.css";
import Loader from "./Loading/Loading";

const FlipCard = () => {
    const [files, setFiles] = useState([]);
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [TTL, setTTL] = useState(3600);
    const MAX_FILE_SIZE_MB = 50;
    const MAX_FILES = 10;

    const handleFilesChange = (incomingFiles) => {
        if (incomingFiles.length > MAX_FILES) {
            alert(`You can only upload up to ${MAX_FILES} files.`);
            return;
        }

        const oversizedFiles = incomingFiles.filter(file => file.file.size > MAX_FILE_SIZE_MB * 1024 * 1024);

        if (oversizedFiles.length > 0) {
            alert(`One file exceed the maximum size of ${MAX_FILE_SIZE_MB} MB.`);
            return;
        }

        setFiles(incomingFiles);
    };


    const handleSubmit = async () => {
        if (files.length === 0) {
            alert("⚠️ No files selected");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        files.forEach((fileWrapper) => {
            formData.append("files", fileWrapper.file);
        });
        formData.append("ttl", TTL);

        try {
            const res = await fetch("https://temporary-storage.onrender.com/api/files/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            setLink(data.link);
        } catch (err) {
            console.error("Upload error:", err);
            alert("❌ Upload failed");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        if (link) {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        }
    };

    return (
        <div className="container">
            <div className="form_area">
                <p className="title">Upload your files</p>
                <form action="">
                    <div className="form_group">
                        <Dropzone
                            onChange={handleFilesChange}
                            value={files}
                            maxFiles={MAX_FILES}
                            label="Drag & drop your files here or click to upload"
                        >
                            {files.map((file) => (
                                <FileMosaic
                                    key={file.id}
                                    {...file}
                                    preview
                                    onDelete={() =>
                                        setFiles((prev) => prev.filter((f) => f.id !== file.id))
                                    }
                                />
                            ))}
                        </Dropzone>
                    </div>
                    {link && (
                        <div>
                            <button onClick={handleCopyLink} className="btn">
                                {copied ? "Copied!" : "Copy link"}
                            </button>
                        </div>
                    )}
                    <select onChange={(e) => setTTL(parseInt(e.target.value))} className="select">
                        <option value={3600}>1 hour</option>
                        <option value={12 * 3600}>12 hours</option>
                        <option value={24 * 3600}>24 hours</option>
                    </select>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || files.length === 0}
                        className="btn"
                    >


                        {loading ? (loading && (
                            <div className="full-page-loader">
                                <Loader />
                            </div>
                        )) : "Upload / Get Link"}
                    </button>
                </form>
            </div>
        </div>

    );
};

export default FlipCard;
