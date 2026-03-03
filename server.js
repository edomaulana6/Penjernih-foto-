const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

// Optimasi Memori untuk RAM 1GB
sharp.cache(false); 
sharp.concurrency(2); 

const app = express();
const port = process.env.PORT || 3000;

// Folder sementara sesuai standar Railway
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

app.post('/process', upload.array('photos', 3), async (req, res) => {
    // Ambil status checkbox dari frontend
    const faceFix = req.body.faceEnhance === 'true';
    const zipFileName = `hasil-${Date.now()}.zip`;
    const zipPath = path.join(resultDir, zipFileName);
    const processedFiles = [];
    let firstResultUrl = "";

    try {
        console.log(`[INFO] Memproses ${req.files.length} foto. Face Enhance: ${faceFix}`);

        for (const file of req.files) {
            const outputFileName = `clear-${file.filename}.jpg`;
            const outputPath = path.join(resultDir, outputFileName);
            
            let pipeline = sharp(file.path);

            if (faceFix) {
                // Mode Remini: Denoise halus + Mencerahkan + Penajaman Tinggi
                pipeline = pipeline
                    .median(2)
                    .modulate({ brightness: 1.03, saturation: 1.05 })
                    .sharpen({ sigma: 1.5, m1: 2 });
            } else {
                // Mode Standar
                pipeline = pipeline.median(3).sharpen({ sigma: 1.0 });
            }

            await pipeline
                .resize({ width: 6530, kernel: sharp.kernel.lanczos3 })
                .jpeg({ quality: 90, mozjpeg: true })
                .toFile(outputPath);

            // Simpan URL foto pertama untuk ditampilkan di slider Before/After
            if (!firstResultUrl) firstResultUrl = `/download/${outputFileName}`;
            
            processedFiles.push({ path: outputPath, name: `jernih-${file.originalname}` });
            
            // Hapus file asli segera agar hemat ruang
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }

        // LOGIKA ZIP (WAJIB ADA)
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`[SUKSES] ZIP dibuat: ${archive.pointer()} total bytes`);
            // Hapus file JPG satuan setelah masuk ke ZIP
            processedFiles.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
            
            res.json({ 
                success: true, 
                downloadUrl: `/download/${zipFileName}`,
                previewUrl: firstResultUrl 
            });
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

// Pastikan halaman utama selalu mengarah ke index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server aktif di port ${port} | RAM: 1GB | vCPU: 2`);
});
             
