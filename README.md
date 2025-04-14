# Temporary-storage

This project provides a file uploading and download service built with Node.js, Express, and MongoDB. Files are stored using Supabase storage and can be downloaded individually or bundled into a ZIP archive. The service also includes automated cleanup for expired files, as well as basic integration with Redis (as shown by the docker-compose configuration).

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [File Structure](#file-structure)
- [Code Examples](#code-examples)
- [Docker Configuration](#docker-configuration)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The backend service enables users to upload one or more files via HTTP requests. The uploaded files are stored on Supabase storage, and a MongoDB database (using Mongoose) saves metadata such as the original file names, storage paths, and expiry timestamps. Other endpoints allow downloading individual files or downloading all files as a ZIP archive. Moreover, an interval job automatically deletes expired files from both Supabase and the database.

---

## Features

- **File Uploading:**
  - Upload multiple files with a specified time-to-live (TTL).
  - Store file metadata such as original file names, storage paths, and expiry dates.

- **File Downloading:**
  - Download a single file by querying with an identifier and file index.
  - Download all files for an entry as a ZIP archive.

- **File Validation:**
  - Check if a file group exists and whether it has expired.

- **Automated Cleanup:**
  - Periodically delete expired files from Supabase storage and remove their records from MongoDB.

- **Supabase Integration:**
  - Use Supabase storage for file persistence and signed URL generation.

- **Redis Integration (Optional):**
  - Although the Redis service is commented out, Docker Compose includes Redis which may be used for caching or other purposes in the future.

---

## Technologies Used

- **[Node.js](https://nodejs.org/)**
- **[Express](https://expressjs.com/)**
- **[MongoDB](https://www.mongodb.com/)** / **[Mongoose](https://mongoosejs.com/)**
- **[Supabase Storage](https://supabase.com/)**
- **[Axios](https://axios-http.com/)**
- **[Archiver](https://www.npmjs.com/package/archiver)**
- **[Multer](https://www.npmjs.com/package/multer)**
- **[Redis](https://redis.io/)** (via Docker Compose)
- **[dotenv](https://www.npmjs.com/package/dotenv)**

---

## Installation

### 1. Clone the Repository

Clone the repository to your local machine:

```bash
git clone <repository_url>
cd <repository_folder>
```

### 2. Install Dependencies

Make sure you have Node.js and npm installed. Then run:

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=5000
MONGO_URI=<your_mongodb_connection_string>
SESSION_SECRET=<your_session_secret>
TTL_IN_SECONDS=3600
SUPABASE_URL=<your_supabase_url>
SUPABASE_KEY=<your_supabase_key>
REDIS_URL=<your_redis_url> # Optional if you enable redis.service.js
```

Replace the placeholders with your actual credentials.

---

## Usage

After you configure your environment and install dependencies, start the server with:

```bash
npm start
```

The server will run on the port specified (default: [http://localhost:5000](http://localhost:5000)). You can test the endpoints using tools like Postman or curl.

---

## API Endpoints

### File Upload

- **POST** `/api/files/upload`  
  **Description:** Upload one or more files with an optional TTL.  
  **Request Example:**

  ```bash
  curl -X POST "http://localhost:5000/api/files/upload" \
    -F "files=@/path/to/your/file1.jpg" \
    -F "files=@/path/to/your/file2.pdf" \
    -F "ttl=1800"
  ```

  **Response:**

  ```json
  {
    "link": "https://drive.vzbb.site/open/<file_id>"
  }
  ```

---

### File Download

- **GET** `/api/files/:id`  
  **Description:** Download a specific file from an uploaded file group.  
  **Query Parameter:** `index` (to indicate which file to download)  
  **Example:**  
  `GET http://localhost:5000/api/files/60abc123xyz?index=0`

---

### Check File Validity

- **GET** `/api/files/check/:id`  
  **Description:** Check if a file exists and whether it has expired.  
  **Response Example:**

  ```json
  {
    "valid": true,
    "message": "File exists",
    "file": {
      "originalNames": ["example.jpg"],
      "supabasePaths": ["1625498765432-example.jpg"],
      "expiresAt": "2025-04-14T12:00:00.000Z"
    }
  }
  ```

---

### Download All Files as ZIP

- **GET** `/api/files/:id/zip`  
  **Description:** Download all files for the given file group as a ZIP archive.  
  **Example:**  
  `GET http://localhost:5000/api/files/60abc123xyz/zip`

---

## File Structure

Below is an overview of the project file structure:

```
/project-root
├── controllers
│   └── file.controller.js     # Contains functions for upload, download, check, and ZIP download
├── model
│   └── fileModels.js          # Mongoose schema for file records
├── routes
│   └── file.routes.js         # Express routes for file operations
├── services
│   ├── supabase.service.js     # Supabase integration for file storage and URL generation
│   └── redis.service.js        # Redis service (currently commented out)
├── app.js                     # Main server entry point and cleanup job
├── docker-compose.yml         # Docker Compose configuration for Redis service
├── package.json               # Project metadata and dependencies
├── .env                       # Environment configuration file (not committed)
└── README.md                  # Project documentation
```

---

## Code Examples

### 1. File Upload Controller (file.controller.js)

```javascript
import File from "../model/fileModels.js";
import { uploadToSupabase, getSupabaseUrl } from "../services/supabase.service.js";
import archiver from "archiver";
import axios from "axios";

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
        res.json({ link: `https://drive.vzbb.site/open/${newFile._id}` });
    } catch (err) {
        console.error("Upload error:", err.message);
        res.status(500).json({ error: err.message });
    }
};
```

### 2. File Download as ZIP (file.controller.js – Excerpt)

```javascript
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
```

### 3. Supabase Service (supabase.service.js)

```javascript
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export const uploadToSupabase = async (file) => {
    const cleanName = file.originalname
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x00-\x7F]/g, "")
        .replace(/\s+/g, "_");

    const filename = `${Date.now()}-${cleanName}`;
    const { data, error } = await supabase.storage.from("files").upload(filename, file.buffer);
    if (error) throw error;
    return data.path;
};

export const getSupabaseUrl = async (path, ttlInSeconds = process.env.TTL_IN_SECONDS) => {
    const { data, error } = await supabase.storage.from("files").createSignedUrl(path, ttlInSeconds);
    if (error) throw error;
    return data.signedUrl;
};

export const deleteFromSupabase = async (path) => {
    const { error } = await supabase.storage.from("files").remove([path]);
    if (error) throw error;
};
```

### 4. Main Server and Cleanup Job (app.js)

```javascript
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fileRoutes from "./routes/file.routes.js";
import File from "./model/fileModels.js";
import { deleteFromSupabase } from "./services/supabase.service.js";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: "https://drive.vzbb.site"
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");
    })
    .catch((err) => console.error("MongoDB Error:", err));

// Use file routes for all file operations
app.use("/api/files", fileRoutes);

// Automated cleanup: Delete expired files every 5 minutes
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
}, 1000 * 60 * 5); // Every 5 minutes

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

## Docker Configuration

The project includes a simple Docker Compose setup for running Redis (if needed). Here is the `docker-compose.yml`:

```yaml
version: '3'

services:
  redis:
    image: redis:latest
    container_name: redis
    ports:
      - "6379:6379"
```

---

## File Structure

```
/project-root
├── controllers
│   └── file.controller.js       # File upload, download, check, and ZIP download logic
├── model
│   └── fileModels.js            # Mongoose schema for uploaded file metadata
├── routes
│   └── file.routes.js           # Express routes for file-related operations
├── services
│   ├── supabase.service.js       # Integration with Supabase storage
│   └── redis.service.js          # Redis service configuration (commented out)
├── app.js                       # Entry point and periodic cleanup job
├── docker-compose.yml           # Docker Compose file for Redis
├── package.json                 # Project metadata and dependencies
└── .env                         # Environment configuration (not committed)
```
