const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { print } = require("pdf-to-printer");

const app = express();

const PORT = process.env.PORT || 3000;


app.set("trust proxy", 1);

app.use(cors());
const uploadLimiter = rateLimit({
    windowMs: 12 * 60 * 60 * 1000,
    max: 5,
    message: "Too many uploads, try again later"
});


const upload = multer({
    dest: path.join(__dirname, "../uploads"),
    limits: { fileSize: 10 * 1024 * 1024 }
});


function generateCode() {
    return crypto.randomBytes(3).toString("hex").toUpperCase();
}


app.post("/upload", uploadLimiter, upload.single("file"), (req, res) => {
    
    try {
        const code = generateCode();
        console.log("Upload hit from IP:", req.ip);
        const pdfPath = path.join(__dirname, "../uploads", code + ".pdf");
        const metaPath = pdfPath + ".json";

        fs.renameSync(req.file.path, pdfPath);


        const expiryTime = Date.now() + (30 * 60 * 1000);

        fs.writeFileSync(metaPath, JSON.stringify({ expiryTime }));

        res.json({ code });

    } catch (err) {
        res.status(500).send("Upload failed pdf size is greater than 10mb kindly download it print manually");
    }
});

// these is the function to give preview before print (user has access)
app.get("/file/:code", (req, res) => {
    const code = req.params.code.toUpperCase();

    const pdfPath = path.join(__dirname, "../uploads", code + ".pdf");
    const metaPath = pdfPath + ".json";

    if (!fs.existsSync(pdfPath)) {
        return res.status(404).send("File not found");
    }


    res.sendFile(pdfPath, (err) => {
        if (err) {
            console.log("Error sending file:", err);
        } else {
            console.log("File sent, deleting...");


            try {
                setTimeout(() => {
                    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
                    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
                }, 10000);
            } catch (e) {
                console.log("Delete error:", e);
            }
        }
    });
});



// app.get("/print/:code", async (req, res) => {
//     try {
//         const code = req.params.code;

//         const pdfPath = path.join(__dirname, "uploads", code + ".pdf");

//         if (!fs.existsSync(pdfPath)) {
//             return res.status(404).send("File not found");
//         }

//         // 🔥 DIRECT PRINT (NO PREVIEW)
//         await print(pdfPath);

//         // delete after print
//         fs.unlinkSync(pdfPath);

//         res.send("Printed successfully");

//     } catch (err) {
//         console.error(err);
//         res.status(500).send("Print failed");
//     }
// });

app.use(express.static(path.join(__dirname, "../frontend")));

app.get('/ping', (req,res)=>{
    res.status(200).send('OK');
});

setInterval(() => {
    const files = fs.readdirSync("../uploads");

    files.forEach(file => {
        if (file.endsWith(".json")) {
            const metaPath = path.join("../uploads", file);
            const meta = JSON.parse(fs.readFileSync(metaPath));

            if (Date.now() > meta.expiryTime) {
                const pdfFile = file.replace(".pdf.json", ".pdf");

                fs.unlinkSync(metaPath);
                fs.unlinkSync(path.join("../uploads", pdfFile));

            }
        }
    });
}, 5 * 60 * 1000);



app.listen(PORT, () => {
    console.log("Server running on http://localhost:" + PORT);
});