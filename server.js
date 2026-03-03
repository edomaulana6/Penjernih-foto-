const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const Replicate = require("replicate");
const axios = require('axios');

// Mengambil Token dari Railway Variables (Lebih Aman)
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN, 
});

const app = express();
const port = process.env.PORT || 3000;
const uploadDir = '/tmp/uploads';
const resultDir = '/tmp/results';

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });

const upload = multer({ dest: uploadDir });

app.use(express.static('public'));
app.use('/download', express.static(resultDir));

app.post('/process', upload.array('photos', 3), async (req, res) => {
    const faceFix = req.body.faceEnhance === 'true';
    const zipFileName = `hasil-ai-${Date.now()}.zip`;
    const zipPath = path.join(resultDir, zipFileName);
    const processedFiles = [];
    let firstResultUrl = "";

    try {
        if (!process.env.REPLICATE_API_TOKEN) {
            throw new Error("API Token belum dipasang di Railway Variables.");
        }

        for (const file of req.files) {
            const outputFileName = `ai-clear-${file.filename}.jpg`;
            const outputPath = path.join(resultDir, outputFileName);
            let finalImageUrl;

            // Membaca file dan konversi ke Base64 untuk dikirim ke Mesin AI
            const imageBuffer = fs.readFileSync(file.path);
            const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

            if (faceFix) {
                // MESIN AI GFPGAN: Menggambar ulang detail wajah agar super jernih (Ala Wink)
                finalImageUrl = await replicate.run(
                    "tencentarc/gfpgan:92836085966d4a2418e409540a65101457011e53a2d23f36a992062f27d14ad4",
                    { input: { img: base64Image, version: "v1.4", upscale: 2 } }
                );
            } else {
                // MESIN AI REAL-ESRGAN: Penjernih umum/pemandangan
                finalImageUrl = await replicate.run(
                    "nightmareai/real-esrgan:42fed1c4974141103ad458c039d300cd01739567ec355ee61c193e994070732d",
                    { input: { image: base64Image, upscale: 2 } }
                );
            }

            // Download file hasil dari Cloud AI ke server lokal untuk proses ZIP
            const response = await axios({ url: finalImageUrl, responseType: 'stream' });
            const writer = fs.createWriteStream(outputPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            if (!firstResultUrl) firstResultUrl = finalImageUrl;
            processedFiles.push({ path: outputPath, name: `jernih-${file.originalname}` });
            
            // Hapus file sampah
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }

        // Membuat File ZIP
        const outputZip = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        outputZip.on('close', () => {
            // Hapus file satuan setelah masuk ZIP agar hemat memori
            processedFiles.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
            res.json({ success: true, downloadUrl: `/download/${zipFileName}`, previewUrl: firstResultUrl });
        });

        archive.pipe(outputZip);
        processedFiles.forEach(f => archive.file(f.path, { name: f.name }));
        await archive.finalize();

    } catch (error) {
        console.error("Gagal memproses dengan Mesin AI:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, '0.0.0.0', () => {
    console.log(`Server AI Berjalan di port ${port}`);
});
    
