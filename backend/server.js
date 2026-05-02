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

app.use((req, res, next) => {
    res.setTimeout(5 * 60 * 1000); // 5 minutes
    next();
});

app.use(cors());
const uploadLimiter = rateLimit({
    windowMs: 12 * 60 * 60 * 1000,
    max: 100,
    message: "Too many uploads, try again later"
});


const upload = multer({
    dest: path.join(__dirname, "../uploads"),
    limits: { fileSize: 10 * 1024 * 1024 }
});


function generateCode() {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}


app.post("/upload", uploadLimiter, upload.single("file"), (req, res) => {
    
    try {
        const code = generateCode();
        console.log("Upload hit from IP:", req.ip);
        const pdfPath = path.join(__dirname, "../uploads", code + ".pdf");
        const metaPath = pdfPath + ".json";

        fs.renameSync(req.file.path, pdfPath);


        const expiryTime = Date.now() + (30 * 60 * 1000);

        fs.writeFileSync(metaPath, JSON.stringify({ expiryTime ,seen:false }));

        res.json({ code });

    } catch (err) {
        res.status(500).send("Upload failed pdf size is greater than 10mb kindly download it print manually");
    }
});

// these is the function to give preview before print (user has access)
// app.get("/file/:code", (req, res) => {
//     const code = req.params.code.toUpperCase();

//     const pdfPath = path.join(__dirname, "../uploads", code + ".pdf");
//     const metaPath = pdfPath + ".json";

//     if (!fs.existsSync(pdfPath)) {
//         return res.status(404).send("File not found");
//     }
//     const stat=fs.statSync(pdfPath);

//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader("Content-Dispositin","attachment; filename= file.pdf")
//     res.setHeader("Content-Length",stat.size);

//     const stream = fs.createReadStream(pdfPath);

//     // delete ONLY after response is fully done
//     // res.on("finish", () => {
//     //     console.log("Download complete, deleting file...");

//     //     try {
//     //         if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
//     //         if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
//     //     } catch (err) {
//     //         console.log("Delete error:", err);
//     //     }
//     // });

//     stream.on("error", (err) => {
//         console.log("Stream error:", err);
//         res.status(500).end("Error reading file");
//     });

//     stream.pipe(res);
// });



// app.get("/file/:code",   (req, res) => {
//     const code = req.params.code.toUpperCase();

//     const pdfPath = path.join(__dirname, "../uploads", code + ".pdf");

//     if (!fs.existsSync(pdfPath)) {
//         return res.status(404).send("File not found");
//     }

//     // Headers (important)
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader("Content-Disposition", `inline; filename="${code}.pdf"`);

//     // Send file (handles streaming internally)
//     res.sendFile(pdfPath, (err) => {
//         if (err) {
//             console.log("SendFile error:", err);
//             if (!res.headersSent) {
//                 res.status(500).send("Error sending file");
//             }
//         } else {
//             console.log("File served:", code);
           
//         }
        
//     });

// });


app.get("/file/:code", (req, res) => {
    const code = req.params.code.toUpperCase();

    const pdfPath = path.join(__dirname, "../uploads", code + ".pdf");
    const metaPath = pdfPath + ".json"; // ✅ FIX

    if (!fs.existsSync(pdfPath)) {
        return res.status(404).send("File not found");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${code}.pdf"`);

    res.sendFile(pdfPath, (err) => {
        if (err) {
            console.log("SendFile error:", err);
            if (!res.headersSent) {
                res.status(500).send("Error sending file");
            }
        } else {
            console.log("File served:", code);

           
            if (fs.existsSync(metaPath)) {
                fs.promises.readFile(metaPath, "utf-8")
                    .then(data => {
                        const meta = JSON.parse(data);

                        if (!meta.seen) {
                            meta.seen = true;
                            return fs.promises.writeFile(metaPath, JSON.stringify(meta));
                        }
                    })
                    .catch(err => console.log("Meta update failed:", err));
            }
        }
    });
});

app.get("/detail", (req, res) => {
    const dir = path.join(__dirname, "../uploads");

    try {
        const files = fs.readdirSync(dir);
        const result = [];

        files.forEach(file => {
            if (file.endsWith(".json")) {
                const metaPath = path.join(dir, file);

                try {
                    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
                    const pdfFile = file.replace(".pdf.json", ".pdf");

                    // ✅ convert expiry to readable format
                    const readableExpiry = new Date(meta.expiryTime).toLocaleString();

                    result.push({
                        file: pdfFile,         
                        expiryReadable: readableExpiry,       
                        seen: meta.seen
                    });

                } catch (err) {
                    console.log("Error reading:", file);
                }
            }
        });

        res.json(result);

    } catch (err) {
        console.log("Detail scan error:", err);
        res.status(500).json({ error: "Failed to scan uploads" });
    }
});


app.use(express.static(path.join(__dirname, "../frontend")));

app.get('/ping', (req,res)=>{
    res.status(200).send('OK');
});

setInterval(() => {
    const files = fs.readdirSync(path.join(__dirname,'../uploads'));

    files.forEach(file => {
        if (file.endsWith(".json")) {
            const metaPath = path.join(__dirname,"../uploads", file);
            const meta = JSON.parse(fs.readFileSync(metaPath));

            if (Date.now() > meta.expiryTime || meta.seen===true) {
                const pdfFile = file.replace(".pdf.json", ".pdf");

                fs.unlinkSync(metaPath);
                fs.unlinkSync(path.join(__dirname,"../uploads", pdfFile));

            }
        }
    });
}, 5 * 60 * 1000);



app.listen(PORT, () => {
    console.log("Server running on http://localhost:" + PORT);
});