// reset.js
const pool = require('./db');

const resetTables = async () => {
  try {
    console.log("🗑️  Menghapus tabel lama...");
    // Hapus tabel jika ada (urutan penting karena foreign key)
    await pool.query('DROP TABLE IF EXISTS reviews CASCADE');
    await pool.query('DROP TABLE IF EXISTS books CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    
    console.log("✅ Tabel lama berhasil dihapus!");
  } catch (err) {
    console.error("❌ Gagal menghapus tabel:", err);
  } finally {
    pool.end();
  }
};

resetTables();