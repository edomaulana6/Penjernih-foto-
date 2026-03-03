const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
const port = process.env.PORT || 3000;

const uploadDir = '/tmp/uploads';
const resultDir = '/tmp/results';

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });

const upload = multer({ 
    dest: uploadDir,
    limits: { fileSize: 25 * 1024 * 1024 } 
});

app.use(express.static('public'));
app.use('/download', express.static(resultDir));

// Route untuk memproses maksimal 3 foto
app.post('/process', upload.array('photos', 3), async (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).send('Tidak ada file.');

    const zipFileName = `hasil-jernih-${Date.now()}.zip`;
    const zipPath = path.join(resultDir, zipFileName);
    const processedFiles = [];

    try {
        console.log(`Menerima ${req.files.length} foto. Memulai antrean...`);
        sharp.concurrency(1); // Fokus tenaga CPU

        // PROSES SATU PER SATU
        for (const file of req.files) {
            const outputFileName = `clear-${file.filename}.jpg`;
            const outputPath = path.join(resultDir, outputFileName);
            
            console.log(`Memproses: ${file.originalname} -> 32MP`);
            
            await sharp(file.path)
                .median(3)
                .resize({ width: 6530, kernel: sharp.kernel.lanczos3 })
                .sharpen({ sigma: 1.0, m1: 1.0, m2: 20 })
                .jpeg({ quality: 90, mozjpeg: true })
                .toFile(outputPath);

            processedFiles.push({ path: outputPath, name: `jernih-${file.originalname}` });
            fs.unlinkSync(file.path); // Hapus file asli segera
        }

        // MEMBUAT ZIP
        console.log("Membungkus ke ZIP...");
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            // Hapus file satuan setelah di-zip agar hemat storage
            processedFiles.forEach(f => fs.unlinkSync(f.path));
            res.json({ success: true, downloadUrl: `/download/${zipFileName}` });
        });

        archive.pipe(output);
        processedFiles.forEach(f => archive.file(f.path, { name: f.name }));
        await archive.finalize();

    } catch (error) {
        console.error(error);
        res.status(500).send('Gagal memproses.');
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
                                                        
