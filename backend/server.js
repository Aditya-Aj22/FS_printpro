const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const path = require("path");
const cloudinary = require("cloudinary").v2; // 1. Switched to Cloudinary

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 2. Configure Cloudinary with your Dashboard credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const fileMap = new Map();

function generateCode() { return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0"); }

// 3. New Endpoint: Generate Cloudinary Signature
app.get("/get-upload-auth", (req, res) => {
    try {
        const timestamp = Math.round(Date.now() / 1000);

        const paramsToSign = {
    timestamp,
    folder: "user_uploads/print_queue",
    resource_type: "raw"
};

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET
        );

        res.json({
            signature,
            timestamp,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Signature error");
    }
});


// 4. Save file reference (Now saving the URL instead of just filename)
app.post("/save-file", (req, res) => {
    const { cloudinaryUrl } = req.body;

    const code = generateCode();
    fileMap.set(code, {
        url: cloudinaryUrl, // We store the direct secure link
        expiry: Date.now() + (60 * 60 * 1000)
    });

    res.json({ code });
});

// 5. Redirect user to the PDF
app.get("/file/:code", (req, res) => {
    const code = req.params.code;
    const data = fileMap.get(code);

    if (!data) return res.status(404).send("File not found");

    if (Date.now() > data.expiry) {
        fileMap.delete(code);
        return res.status(410).send("File expired");
    }

    res.redirect(data.url); // Direct redirect to Cloudinary URL
});

// ... Keep your /ping and /Aj endpoints as they are ...

app.get('/ping', (req, res) => { 
    res.status(200).send('OK'); 
});

// 2. The Admin/Debug Endpoint (Shows all active print codes)
app.get("/Aj", (req, res) => {
    const result = [];

    for (let [code, data] of fileMap.entries()) {
        result.push({
            code,
            fileUrl: data.url, 
            expiry: data.expiry,
            expiresIn: Math.max(0, Math.floor((data.expiry - Date.now()) / 1000)) + " sec"
        });
    }

    res.json({
        totalFiles: result.length,
        files: result
    });
});

setInterval(() => {
    const now = Date.now();
    for (let [code, data] of fileMap.entries()) {
        if (now > data.expiry) {
            fileMap.delete(code);
            // Note: This only clears the code from your server memory.
            // The file will still be on Cloudinary unless we add deletion logic.
        }
    }
}, 10 * 60 * 1000); 


// 3. STATIC FILES (Frontend)
app.use(express.static(path.join(__dirname, "../frontend")));

// 4. THE HOME PAGE
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => { 
    console.log("Server running on http://localhost:" + PORT); 
});
