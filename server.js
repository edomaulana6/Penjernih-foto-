const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

// --- OPTIMASI MEMORI & CPU ---
// Matikan cache internal agar RAM 1GB segera dibebaskan setelah proses selesai
sharp.cache(false); 
// Gunakan 2 thread sesuai dengan 2 vCPU Railway Anda
sharp.concurrency(2); 

const app = express();
const port = process.env.PORT || 3000;

// Gunakan folder /tmp (Standard Railway ephemereal storage)
const uploadDir = '/tmp/uploads';
const resultDir = '/tmp/results';

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });

// Konfigurasi Multer
const upload = multer({ 
    dest: uploadDir,
    limits: { 
        fileSize: 25 * 1024 * 1024, // Maks 25MB per file
        files: 3 // Maksimal 3 file sekaligus
    } 
});

app.use(express.static('public'));
app.use('/download', express.static(resultDir));

// Route Utama
app.post('/process', upload.array('photos', 3), async (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).send('Tidak ada file yang diunggah.');

    const zipFileName = `hasil-jernih-${Date.now()}.zip`;
    const zipPath = path.join(resultDir, zipFileName);
    const processedFiles = [];

    try {
        console.log(`[INFO] Menerima ${req.files.length} foto. Memulai antrean...`);

        // PROSES SATU PER SATU (Antrean menggunakan for-of await)
        for (const file of req.files) {
            const outputFileName = `clear-${file.filename}.jpg`;
            const outputPath = path.join(resultDir, outputFileName);
            
            console.log(`[PROSES] Mengolah: ${file.originalname} ke 32MP...`);
            
            await sharp(file.path)
                .median(3) // Denoise awal
                .resize({ 
                    width: 6530, // Target 32MP (lebar)
                    kernel: sharp.kernel.lanczos3, // Anti-pecah
                    fastShrinkOnLoad: false // Prioritaskan kualitas dibanding kecepatan muat
                })
                .sharpen({ 
                    sigma: 1.0, 
                    m1: 1.0, 
                    m2: 20 
                }) // Penajaman natural
                .jpeg({ 
                    quality: 90, 
                    mozjpeg: true 
                }) // Kompresi cerdas
                .toFile(outputPath);

            processedFiles.push({ path: outputPath, name: `jernih-${file.originalname}` });
            
            // Segera hapus file asli setelah diproses untuk hemat storage
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            
            console.log(`[BERHASIL] ${file.originalname} selesai.`);
        }

        // MEMBUAT ZIP
        console.log("[ZIP] Membungkus semua hasil...");
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`[SELESAI] ZIP Berhasil dibuat: ${zipFileName}`);
            // Hapus file satuan setelah dimasukkan ke ZIP
            processedFiles.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
            res.json({ success: true, downloadUrl: `/download/${zipFileName}` });
        });

        archive.on('error', (err) => { throw err; });
        archive.pipe(output);

        for (const f of processedFiles) {
            archive.file(f.path, { name: f.name });
        }
        
        await archive.finalize();

    } catch (error) {
        console.error("[ERROR]", error);
        res.status(500).json({ success: false, message: 'Gagal memproses foto.' });
    }
});

// Menangani limit upload berlebih
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).send('Maksimal 3 foto saja.');
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).send('File terlalu besar (Maks 25MB).');
    }
    next(err);
});

app.listen(port, () => {
    console.log(`=================================`);
    console.log(`Server Jernih Foto Running!`);
    console.log(`Port: ${port}`);
    console.log(`Spec: 2 vCPU | 1 GB RAM`);
    console.log(`=================================`);
});
         
