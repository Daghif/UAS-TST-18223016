# Gunakan image Node.js versi LTS (Long Term Support) yang ringan (Alpine Linux)
FROM node:18-alpine

# Tentukan folder kerja di dalam container
WORKDIR /app

# Copy package.json dan package-lock.json lebih dulu
# Tujuannya agar Docker bisa cache layer ini jika tidak ada perubahan dependency
COPY package*.json ./

# Install dependencies (gunakan --production untuk skip devDependencies jika ada)
RUN npm install

# Copy seluruh sisa kode aplikasi ke dalam container
COPY . .

# Buka port 3000 (sesuai dengan default aplikasi Anda)
EXPOSE 3000

# Perintah untuk menjalankan aplikasi saat container start
CMD ["node", "index.js"]