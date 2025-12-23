// update_schema.js
const pool = require('./db');

const updateTables = async () => {
  try {
    console.log("🔄 Mengupdate tabel users...");
    // Menambah kolom password jika belum ada
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password VARCHAR(255);
    `);
    
    console.log("✅ Kolom password berhasil ditambahkan!");
  } catch (err) {
    console.error("❌ Gagal update schema:", err);
  } finally {
    pool.end();
  }
};

updateTables();