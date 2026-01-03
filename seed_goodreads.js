// seed_goodreads.js
const fs = require('fs');
const csv = require('csv-parser');
const pool = require('./db'); // Menggunakan koneksi dari db.js

const CSV_FILENAME = 'goodreads_library_export.csv';

const importGoodreadsData = async () => {
  // Cek apakah file CSV ada
  if (!fs.existsSync(CSV_FILENAME)) {
    console.error(`❌ Error: File '${CSV_FILENAME}' tidak ditemukan!`);
    console.error("   Pastikan file CSV ada di folder yang sama dengan script ini.");
    process.exit(1);
  }

  const results = [];

  console.log("📂 Membaca file CSV...");
  fs.createReadStream(CSV_FILENAME)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`✅ Berhasil membaca ${results.length} baris data.`);
      await processData(results);
    });
};

const processData = async (data) => {
  const client = await pool.connect();
  
  try {
    console.log("🚀 Mulai proses import ke database...");
    
    // 1. Buat User Dummy untuk Import
    let userId;
    const userCheck = await client.query("SELECT id FROM users WHERE email = $1", ['goodreads@import.com']);
    
    if (userCheck.rows.length > 0) {
      userId = userCheck.rows[0].id;
    } else {
      const newUser = await client.query(
        "INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id",
        ['goodreads@import.com', 'Goodreads Archive', '$2a$10$DUMMYPASSWORDHASH......'] 
      );
      userId = newUser.rows[0].id;
      console.log(`👤 User 'Goodreads Archive' dibuat (ID: ${userId})`);
    }

    let successCount = 0;
    let skippedCount = 0;

    // 2. Loop setiap baris CSV
    for (const row of data) {
      // Mapping nama kolom dari CSV Goodreads
      const title = row['Title'];
      const author = row['Author'];
      // Konversi rating ke integer, default 0 jika kosong
      const myRating = parseInt(row['My Rating']) || 0; 
      const myReview = row['My Review'] || ''; 
      
      // Filter: Hanya import buku yang sudah dirating (Rating > 0)
      if (myRating > 0) {
        
        // A. Insert Buku 
        // (Menggunakan ON CONFLICT DO NOTHING agar tidak error jika dijalankan 2x, asumsi judul unik)
        // Jika Postgres versi lama tidak support, query insert biasa juga oke.
        let bookId;
        
        // Cek dulu apakah buku sudah ada
        const existingBook = await client.query("SELECT id FROM books WHERE title = $1", [title]);
        
        if (existingBook.rows.length > 0) {
            bookId = existingBook.rows[0].id;
        } else {
            const bookInsert = await client.query(
                "INSERT INTO books (title, author, description) VALUES ($1, $2, $3) RETURNING id",
                [title, author, "Diimpor dari koleksi Goodreads"]
            );
            bookId = bookInsert.rows[0].id;
        }

        // B. Insert Review
        await client.query(
          "INSERT INTO reviews (book_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)",
          [bookId, userId, myRating, myReview]
        );

        console.log(`✅ Imported: ${title} (${myRating}⭐)`);
        successCount++;
      } else {
        skippedCount++;
      }
    }

    console.log("\n==========================================");
    console.log(`🎉 SELESAI!`);
    console.log(`✅ Data Masuk: ${successCount} buku`);
    console.log(`⏩ Di-skip (Belum dibaca/Rating 0): ${skippedCount} buku`);
    console.log("==========================================");

  } catch (err) {
    console.error("❌ Terjadi Error Database:", err.message);
  } finally {
    client.release();
    pool.end(); 
  }
};

importGoodreadsData();