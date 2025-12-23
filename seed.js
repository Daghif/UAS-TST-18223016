// seed.js
const pool = require('./db');

const seedDatabase = async () => {
  try {
    console.log("🌱 Mulai proses seeding data...");

    // --- 1. MEMBERSIHKAN DATA LAMA (OPSIONAL) ---
    // Uncomment baris di bawah jika ingin data selalu bersih setiap kali seed dijalankan
    // await pool.query('TRUNCATE users, books, reviews RESTART IDENTITY CASCADE');

    // --- 2. INSERT USERS ---
    console.log("👤 Menambahkan User...");
    const userRes = await Promise.all([
      pool.query("INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id", ['ali@contoh.com', 'Ali Topan']),
      pool.query("INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id", ['budi@contoh.com', 'Budi Santoso']),
      pool.query("INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id", ['citra@contoh.com', 'Citra Kirana'])
    ]);
    
    const users = userRes.map(r => r.rows[0].id);

    // --- 3. INSERT BOOKS ---
    console.log("📚 Menambahkan Buku...");
    const bookRes = await Promise.all([
      pool.query("INSERT INTO books (title, author, description) VALUES ($1, $2, $3) RETURNING id", 
        ['Laskar Pelangi', 'Andrea Hirata', 'Kisah perjuangan anak-anak Belitong mengejar mimpi.']),
      pool.query("INSERT INTO books (title, author, description) VALUES ($1, $2, $3) RETURNING id", 
        ['Atomic Habits', 'James Clear', 'Cara mudah membangun kebiasaan baik dan menghilangkan kebiasaan buruk.']),
      pool.query("INSERT INTO books (title, author, description) VALUES ($1, $2, $3) RETURNING id", 
        ['Filosofi Teras', 'Henry Manampiring', 'Penerapan stoisisme dalam kehidupan sehari-hari.'])
    ]);

    const books = bookRes.map(r => r.rows[0].id);

    // --- 4. INSERT REVIEWS ---
    console.log("⭐ Menambahkan Review...");
    await Promise.all([
      // Review untuk Laskar Pelangi (Book 0)
      pool.query("INSERT INTO reviews (book_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)", 
        [books[0], users[0], 5, "Sangat inspiratif, wajib dibaca!"]),
      pool.query("INSERT INTO reviews (book_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)", 
        [books[0], users[1], 4, "Ceritanya bagus, tapi agak sedih di akhir."]),

      // Review untuk Atomic Habits (Book 1)
      pool.query("INSERT INTO reviews (book_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)", 
        [books[1], users[2], 5, "Buku self-help terbaik tahun ini."]),

      // Review untuk Filosofi Teras (Book 2)
      pool.query("INSERT INTO reviews (book_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)", 
        [books[2], users[0], 4, "Membuka wawasan tentang ketenangan hidup."])
    ]);

    console.log("✅ Seeding selesai! Data berhasil ditambahkan.");

  } catch (err) {
    if (err.code === '23505') {
      console.log("⚠️  Data mungkin sudah ada (Unique constraint violation).");
    } else {
      console.error("❌ Gagal seeding:", err);
    }
  } finally {
    pool.end();
  }
};

seedDatabase();