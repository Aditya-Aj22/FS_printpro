// const { PDFDocument } =require("pdf-lib");
const fileInput = document.getElementById('files');
const fileList = document.getElementById('fileList');

const showLoad = () => document.getElementById('loader').classList.remove('hidden');
const hideLoad = () => document.getElementById('loader').classList.add('hidden');


if (!navigator.storage || !navigator.storage.getDirectory) {
    alert("Your browser doesn't fully support file storage. Please use Chrome for best experience.");
}

fileInput.addEventListener('change', () => {
    fileList.innerHTML = '';

    Array.from(fileInput.files).forEach((file, index) => {
        fileList.innerHTML += `
            <div class="bg-gray-50 p-3 rounded-xl border">
            <p class="text-sm font-medium mb-2">${file.name}</p>

            <div class="flex gap-2">
            <div>copies</div>
                <input type="number" value="1" min="1" id="copies-${index}" 
                class="w-1/2 border rounded-lg p-1 text-sm" placeholder="Copies"/>
            <div>pages</div>
                <input type="text" id="pages-${index}" 
                placeholder=" default(all)||1-3,5,7,8-10"
                class="w-1/2 border rounded-lg p-1 text-sm"/>
            </div>
            </div>
            `;
    });
});



// async function merge() {
//     const formData = new FormData();
//     Array.from(fileInput.files).forEach((file, index) => {
//         formData.append('files', file);
//         formData.append(`pages-${index}`, document.getElementById(`pages-${index}`).value || 'all');
//         formData.append(`copies-${index}`, document.getElementById(`copies-${index}`).value || 1);
//     });

// const res = await fetch('/merge',{
//     method:"post",
//     body:formData
// })


function parsePages(input, totalPages) {
    if (!input || input.toLowerCase() === 'all') {
        return [...Array(totalPages).keys()];
    }

    const result = [];

    const parts = input.split(',');

    for (let part of parts) {
        part = part.trim();

        // Range case (e.g., 1-3)
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);

            if (isNaN(start) || isNaN(end) || start > end) {
                throw new Error(`Invalid range: ${part}`);
            }

            for (let i = start; i <= end; i++) {
                if (i < 1 || i > totalPages) {
                    throw new Error(`Page out of range: ${i}`);
                }
                result.push(i - 1);
            }
        }
        // Single page
        else {
            const num = Number(part);

            if (isNaN(num)) {
                throw new Error(`Invalid page number: ${part}`);
            }

            if (num < 1 || num > totalPages) {
                throw new Error(`Page out of range: ${num}`);
            }

            result.push(num - 1);
        }
    }

    return result;
}

async function merge() {
    showLoad();
    try {
        const mergepdf = await PDFLib.PDFDocument.create();
        const files = Array.from(fileInput.files);

        for (let i = 0; i < files.length; i++) {

            const pdf = await PDFLib.PDFDocument.load(await files[i].arrayBuffer());

            const pagesInput = document.getElementById(`pages-${i}`).value;
            const copyCount = parseInt(document.getElementById(`copies-${i}`).value) || 1;



            try {
                pageIndexes = parsePages(pagesInput, pdf.getPageCount());
            } catch (err) {
                alert(`Error in file "${files[i].name}":\n${err.message}`);
                return; // stop merge
            }

            const pages = await mergepdf.copyPages(pdf, pageIndexes);

            for (let c = 0; c < copyCount; c++) {
                pages.forEach(p => mergepdf.addPage(p));
            }
        }

        const pdfBytes = await mergepdf.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });

        const totalpages = mergepdf.getPageCount();

        // _Pages${}

        await savePDF(`Job_pages${totalpages}_${Date.now()}.pdf`, blob);
        await showfiles();

        const url = URL.createObjectURL(blob);
        window.open(url);
        // fileList.innerHTML = '';

    } catch (err) {
        console.error(err);
        alert("Something went wrong while merging PDFs");
    } finally {
        hideLoad();
    }

}



/// old merge function
// async function merge() {
//     const mergepdf = await PDFDocument.create();

//     const files = Array.from(fileInput.files);

//     for (let i = 0; i < files.length; i++) {

//         const file = files[i];
//         const pdf = await PDFDocument.load(await file.arrayBuffer());

//         const pagescount = document.getElementById(`pages-${i}`).value || 'all';;
//         const copycount = document.getElementById(`copies-${i}`).value || 1;

//         const pageIndexes = parsepages(pagescount, pdf.getPageCount());
//         const pages = await mergepdf.copyPages(pdf, pageIndexes);

//         for (let c = 0; c < copycount; c++) {
//             pages.forEach(p => {
//                 mergepdf.addPage(p)
//             });
//         }
//     }
//     const pdfBytes = await mergepdf.save();

//     // res.setHeader('Content-types', 'application/pdf');
//     // res.send(Buffer.from(pdfBytes))

//     const blob = new Blob([pdfBytes], { type: "application/pdf" });

//     await savePDF(`job_${Date.now()}.pdf`, blob);
//     await showfiles();

//     const url = URL.createObjectURL(blob);
//     window.open(url);


// }



async function savePDF(pdfname, blob) {
    const root = await navigator.storage.getDirectory();
    const filehandler = await root.getFileHandle(pdfname, { create: true });
    const writeable = await filehandler.createWritable();
    await writeable.write(blob);
    writeable.close();
    console.log("saved: ", pdfname);
}

async function showfiles() {
    const root = await navigator.storage.getDirectory();
    const container = document.getElementById("OFiles");

    container.innerHTML = "";

    for await (const [name, handle] of root.entries()) {
        container.innerHTML += `
        <div class="bg-gray-50 border rounded-xl p-3 shadow-sm">
        <p class="text-sm font-medium mb-2 break-all">${name}</p>

        <div class="flex flex-wrap gap-2">
            <button onclick="viewFile('${name}')" 
            class="text-xs bg-blue-500 text-white px-2 py-1 rounded">
            View
            </button>

            <button onclick="downloadFile('${name}')" 
            class="text-xs bg-gray-500 text-white px-2 py-1 rounded">
            Download
            </button>

            <button onclick="uploadFile('${name}')" 
            class="text-xs bg-green-500 text-white px-2 py-1 rounded">
            Upload
            </button>

            <button onclick="deleteFile('${name}')" 
            class="text-xs bg-red-500 text-white px-2 py-1 rounded">
            Delete
            </button>
        </div>
        </div>
        `;
    }
}

async function viewFile(name) {
    const root = await navigator.storage.getDirectory();
    const filehandler = await root.getFileHandle(name);
    const file = await filehandler.getFile();

    const url = URL.createObjectURL(file);
    window.open(url);
}
async function downloadFile(name) {
    const root = await navigator.storage.getDirectory();
    const filehandler = await root.getFileHandle(name);
    const file = await filehandler.getFile();

    const url = URL.createObjectURL(file);


    let newName = prompt("Enter file name:", name);


    if (!newName) return;


    if (!newName.toLowerCase().endsWith(".pdf")) {
        newName += ".pdf";
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = newName;
    a.click();
}

async function deleteFile(name) {
    const root = await navigator.storage.getDirectory();

    await root.removeEntry(name);
    showfiles();
}


// old upload without option to copy code
// async function uploadFile(name) {
//     const root = await navigator.storage.getDirectory();
//     const fileHandle = await root.getFileHandle(name);
//     const file = await fileHandle.getFile();

//     const formData = new FormData();
//     formData.append("file", file);

//     const res = await fetch("/upload", {
//         method: "POST",
//         body: formData
//     });

//     if (!res.ok) {
//         const contentType = res.headers.get("content-type");

//         let err;

//         if (contentType && contentType.includes("application/json")) {
//             const data = await res.json();
//             err = data.message;
//         } else {
//             err = await res.text();
//         }

//         alert(err);
//         return;
//     }

//     const data = await res.json();
//     alert("Your Print Code: " + data.code + " is valid for only 30min ,take a print before that!!");
// }
//this is the function that sent the get request to print with user [preview]
async function uploadFile(name) {
    showLoad();

    try {
        // 1. Get the file from OPFS (Your existing logic)
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(name);
        const file = await fileHandle.getFile();

        // 2. Get Signature from your server
        const authRes = await fetch("/get-upload-auth");
        const { signature, timestamp, apiKey, cloudName } = await authRes.json();

        // 3. Prepare Cloudinary Form Data
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", apiKey);
        formData.append("timestamp", timestamp);
        formData.append("signature", signature);
        formData.append("upload_preset", "print-pdf"); // Must match your preset name
        formData.append("folder", "user_uploads/print_queue"); // Must match server folder

        // 4. Upload directly to Cloudinary
        const uploadRes = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
            {
                method: "POST",
                body: formData
            }
        );

        if (!uploadRes.ok) throw new Error("Cloudinary upload failed");

        const uploadData = await uploadRes.json();
        const cloudinaryUrl = uploadData.secure_url; // This is the direct link to the PDF

        // 5. Save to your fileMap (Passing the URL now, not just the name)
        const codeRes = await fetch("/save-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cloudinaryUrl: cloudinaryUrl
            })
        });

        const data = await codeRes.json();
        document.getElementById("generatedCodeDisplay").innerText = data.code;

    } catch (err) {
        console.error(err);
        alert("Upload failed: " + err.message);
    } finally {
        hideLoad();
    }
}


// async function uploadFile(name) {

//     showLoad();
//     try {
//         const root = await navigator.storage.getDirectory();
//         const fileHandle = await root.getFileHandle(name);
//         const file = await fileHandle.getFile();

//         const formData = new FormData();
//         formData.append("file", file);

//         const res = await fetch("/upload", { method: "POST", body: formData });

//         if (!res.ok) {
//             const contentType = res.headers.get("content-type");
//             let err = (contentType && contentType.includes("application/json")) 
//             ? (await res.json()).message 
//             : await res.text();
//             alert(err);
//             return;
//         }

//         const data = await res.json();


//         // --- NEW LOGIC: Update the UI instead of just alerting ---
//         const copySection = document.getElementById("copySection");
//         const display = document.getElementById("generatedCodeDisplay");

//         display.innerText = data.code; // Set the code from server
//         copySection.classList.remove("hidden"); // Show the card

//         // Smooth scroll to the code so the user sees it
//         copySection.scrollIntoView({ behavior: 'smooth' });
//     } catch (error) {
//         console.error(error);
//         alert("Something went wrong. The server might be waking up.");
//     }finally{
//         hideLoad();
//     }
// }




// this function is created by AI
function copyToClipboard() {
    const code = document.getElementById("generatedCodeDisplay").innerText;
    const btn = document.getElementById("copyBtn");

    navigator.clipboard.writeText(code).then(() => {
        // 1. Change Text & Color Immediately
        const originalText = btn.innerText;
        btn.innerText = "Copied! ✓";
        btn.style.backgroundColor = "#22c55e"; // Success Green (Tailwind green-500)

        // 2. Revert back after 2 seconds
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.backgroundColor = ""; // Goes back to the CSS class color (blue-600)
        }, 2000);
    }).catch(err => {
        console.error('Copy failed', err);
    });
}

function getFile() {
    const code = document.getElementById("codeInput").value.trim();

    if (!code) {
        alert("Enter code");
        return;
    }
    if (!/^\d+$/.test(code)) {
        alert("Code must contain only numbers ");
        document.getElementById("codeInput").value = '';
        return;
    }
    if (code.length != 6) {
        alert("Code is of 6 digits")
        return;
    }


    const tab = window.open(`/file/${code}`, "_blank");

    if (!tab) {
        alert("Popup blocked! Allow popups. OR File might be deleted kindlyreupload then fetch it!!");
    }
}

// async function getFile() {
//     const code = document.getElementById("codeInput").value.trim();

//     if (!code) {
//         alert("Enter code");
//         return;
//     }

//     showLoad();

//     try {
//         // 🔍 Step 1: check if file exists (HEAD request = fast, no download)
//         const res = await fetch(`/file/${code}`, {
//             method: "HEAD"
//         });

//         if (!res.ok) {
//             throw new Error("File not found or expired");
//         }

//         // ✅ Step 2: open ONLY if file exists
//         const tab = window.open(`/file/${code}`, "_blank");

//         if (!tab) {
//             alert("Popup blocked! Allow popups.");
//         }

//     } catch (err) {
//         alert("File not found or expired");
//     } finally {
//         hideLoad();
//     }
// }




window.getFile = getFile;
window.merge = merge;
window.showfiles = showfiles;
window.viewFile = viewFile;
window.downloadFile = downloadFile;
window.deleteFile = deleteFile;
window.uploadFile = uploadFile;