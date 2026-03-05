# Gunakan Node.js versi 20 yang ringan (slim)
FROM node:20-slim

# Tentukan folder kerja di dalam server
WORKDIR /app

# Salin file konfigurasi paket terlebih dahulu
COPY package*.json ./

# Instal semua dependensi (termasuk alat build seperti Vite)
RUN npm install

# Salin seluruh kode sumber proyek ke dalam server
COPY . .

# Jalankan proses build website (menghasilkan folder 'dist')
RUN npm run build

# Beritahu Railway bahwa aplikasi berjalan di port 3000
EXPOSE 3000

# Perintah untuk menghidupkan server produksi
CMD ["npm", "start"]
