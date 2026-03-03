// ... (Bagian atas Sharp & Express tetap sama)

app.post('/process', upload.array('photos', 3), async (req, res) => {
    const faceFix = req.body.faceEnhance === 'true';
    const zipFileName = `hasil-${Date.now()}.zip`;
    const zipPath = path.join(resultDir, zipFileName);
    const processedFiles = [];
    let firstResultUrl = "";

    try {
        for (const file of req.files) {
            const outputPath = path.join(resultDir, `clear-${file.filename}.jpg`);
            
            let pipeline = sharp(file.path).median(faceFix ? 2 : 3);

            if (faceFix) {
                // Mode Remini: Penajaman lebih agresif & Kontras Wajah
                pipeline = pipeline.modulate({ brightness: 1.03 }).sharpen({ sigma: 1.5, m1: 2 });
            } else {
                pipeline = pipeline.sharpen({ sigma: 1.0, m1: 1 });
            }

            await pipeline
                .resize({ width: 6530, kernel: sharp.kernel.lanczos3 })
                .jpeg({ quality: 90, mozjpeg: true })
                .toFile(outputPath);

            if (!firstResultUrl) firstResultUrl = `/download/clear-${file.filename}.jpg`;
            processedFiles.push({ path: outputPath, name: file.originalname });
            fs.unlinkSync(file.path);
        }

        // Proses ZIP tetap sama seperti sebelumnya...
        // (Gunakan kode archiver yang sudah kamu miliki di sini)
        
        res.json({ 
            success: true, 
            downloadUrl: `/download/${zipFileName}`,
            previewUrl: firstResultUrl 
        });

    } catch (error) {
        res.status(500).json({ success: false });
    }
});
