// const express= require('express')
// const multer = require('multer')
// const {PDFDocument} =require('pdf-lib')

// const app=express();
// const port=3000;
// const upload=multer();

// app.use(express.static('frontend'));
// app.use(express.urlencoded({expected:true}));

// function parsepages(input,totalpages){
//     if(!input || input==='all'){
//         return [...Array(totalpages).keys()];
//     }
//     const result=[];

//     input.split(',').forEach(element => {
//         if(element.includes('-')){
//             const [start,end]=element.split('-').map(Number);
//             for (let i = start; i <=end; i++) {
//                 result.push(Number(i-1));
//             }
//         }
//         else{
//             result.push(Number(element-1));
//         }
//     });
//     return result;
// }

// app.post('/merge', upload.array('files') , async (req,res) =>{
//     try {
//     const mergepdf= await PDFDocument.create();

//     for( let i=0;i<req.files.length;i++){

//         const file=req.files[i];
//         const pdf= await PDFDocument.load(file.buffer);

//         const pagescount=  req.body[`pages-${i}`];
//         const copycount=  req.body[`copies-${i}`];

//         const pageIndexes= parsepages(pagescount, pdf.getPageCount());
//         const pages=await mergepdf.copyPages(pdf,pageIndexes);

//         for(let c=0;c<copycount;c++){
//             pages.forEach(p=>{
//                 mergepdf.addPage(p)
//             });
//         }

//     }
//         const pdfBytes= await mergepdf.save();

//         res.setHeader('Content-types','application/pdf');
//         res.send(Buffer.from(pdfBytes))

    
//    } catch (error) {
//     console.log(error);
//     res.status(500).send('Error generating pdf');
   
    
//    }

// })

// app.listen(port,()=>{
//     console.log(`app is listening on port ${port}`)
// })