const express = require("express");
const cors = require("cors");
const path = require("path");
const B2 = require("backblaze-b2");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const b2 = new B2({
    applicationKeyId: process.env.KeyId,
    applicationKey: process.env.Key
});

const BUCKET_ID = process.env.BUCKET_ID;
const BUCKET_NAME = process.env.BUCKET_NAME;

const fileMap = new Map();

async function authorizeB2() {
    await b2.authorize();
}

app.get("/get-upload-url", async (req, res) => {
    try {
        await authorizeB2();
        const response = await b2.getUploadUrl({
            bucketId: BUCKET_ID
        });
        res.json(response.data);
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to get upload URL");
    }
});

app.post("/save-file", (req, res) => {
    const { code, fileName } = req.body;

    if (!code || !fileName) {
        return res.status(400).send("Missing data");
    }

    fileMap.set(code, {
        fileName,
        expiry: Date.now() + (60 * 60 * 1000)
    });

    res.sendStatus(200);
});

app.get("/file/:code", (req, res) => {
    const code = req.params.code;
    const data = fileMap.get(code);

    if (!data) {
        return res.status(404).send("File not found");
    }

    if (Date.now() > data.expiry) {
        fileMap.delete(code);
        return res.status(410).send("File expired");
    }

    const fileUrl = `https://f000.backblazeb2.com/file/${BUCKET_NAME}/${data.fileName}`;
    res.redirect(fileUrl);
});

app.get('/ping', (req,res)=>{ res.status(200).send('OK'); });

setInterval(() => {
    const now = Date.now();
    for (let [code, data] of fileMap.entries()) {
        if (now > data.expiry) {
            fileMap.delete(code);
        }
    }
}, 10 * 60 * 1000);

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});


app.listen(PORT, () => { console.log("Server running on http://localhost:" + PORT); });