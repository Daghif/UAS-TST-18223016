// setup.js
const pool = require('./db');

const createTables = async () => {
  try {
    console.log("⏳ Sedang membuat tabel...");

    // 1. Tabel Users (Untuk Login)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        password VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Tabel Books (Katalog Buku)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        description TEXT,
        total_pages INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Tabel Reviews (Ulasan & Rating)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // --- FITUR TAMBAHAN (GOODREADS STYLE) ---

    // 4. Tabel Reading Status (Want to Read, Reading, Read)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_books (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
        status VARCHAR(20) CHECK (status IN ('want-to-read', 'reading', 'read', 'dnf')),
        current_page INTEGER DEFAULT 0,
        start_date TIMESTAMP,
        finish_date TIMESTAMP,
        UNIQUE(user_id, book_id)
      );
    `);

    // 5. Tabel Custom Shelves (Rak Buku Buatan User)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shelves (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Tabel Isi Rak (Relasi Buku ke Rak)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shelf_items (
        shelf_id INTEGER REFERENCES shelves(id) ON DELETE CASCADE,
        book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (shelf_id, book_id)
      );
    `);

    // 7. Tabel Review Likes (User Like Review)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_likes (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, review_id)
      );
    `);

    console.log("✅ Semua 7 tabel berhasil dibuat/diperbarui!");
  } catch (err) {
    console.error("❌ Error membuat tabel:", err);
  } finally {
    pool.end();
  }
};

createTables();