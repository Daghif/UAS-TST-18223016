// index.js (VERSI LENGKAP - SEMUA FITUR JADI SATU)
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db'); // Pastikan db.js ada
const authenticateToken = require('./middleware'); // Pastikan middleware.js ada
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. BAGIAN AUTH (Login & Register)
// ==========================================

// Register User
app.post('/api/auth/register', async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Semua field wajib diisi!' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, name, hashedPassword]
    );
    res.status(201).json({ message: "Registrasi berhasil", user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email sudah terdaftar' });
    res.status(500).json({ error: err.message });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User tidak ditemukan' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Password salah' });

    // Buat Token (Berlaku 24 jam)
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: "Login berhasil", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. BAGIAN BUKU (Public & Private)
// ==========================================

// Cari Buku (Search)
app.get('/api/books/search', async (req, res) => {
  const { title } = req.query;
  if (!title) return res.status(400).json({ error: 'Mohon masukkan query ?title=...' });

  try {
    const result = await pool.query(`
      SELECT b.*, COALESCE(AVG(r.rating), 0)::NUMERIC(2,1) as average_rating
      FROM books b LEFT JOIN reviews r ON b.id = r.book_id
      WHERE b.title ILIKE $1
      GROUP BY b.id
    `, [`%${title}%`]);
    
    if (result.rows.length === 0) return res.status(404).json({ message: 'Buku tidak ditemukan' });
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Semua Buku
app.get('/api/books', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, COALESCE(AVG(r.rating), 0)::NUMERIC(2,1) as average_rating 
      FROM books b 
      LEFT JOIN reviews r ON b.id = r.book_id 
      GROUP BY b.id 
      ORDER BY b.id ASC LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Satu Buku (Detail Lengkap dengan Review & Likes)
app.get('/api/books/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Ambil Info Buku
    const bookRes = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (bookRes.rows.length === 0) return res.status(404).json({ error: 'Buku tidak ditemukan' });

    // 2. Ambil Review user lain untuk buku ini
    const reviewsRes = await pool.query(`
      SELECT r.id, r.rating, r.comment, u.name as reviewer, COUNT(rl.user_id) as likes
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN review_likes rl ON r.id = rl.review_id
      WHERE r.book_id = $1
      GROUP BY r.id, u.name
    `, [id]);

    // Gabungkan hasilnya
    const bookData = bookRes.rows[0];
    bookData.reviews = reviewsRes.rows;

    res.json(bookData);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tambah Buku Baru (Wajib Login)
app.post('/api/books', authenticateToken, async (req, res) => {
  const { title, author, description, total_pages } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO books (title, author, description, total_pages) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, author, description, total_pages || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 3. BAGIAN REVIEW & SOSIAL (Likes)
// ==========================================

// Tambah Review
app.post('/api/reviews', authenticateToken, async (req, res) => {
  const { book_id, rating, comment } = req.body;
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating harus 1-5' });

  try {
    const result = await pool.query(
      'INSERT INTO reviews (book_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [book_id, req.user.id, rating, comment]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Like Review Orang Lain
app.post('/api/reviews/:id/like', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO review_likes (user_id, review_id) VALUES ($1, $2)',
      [req.user.id, req.params.id]
    );
    res.json({ message: "Review berhasil di-like! 👍" });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: "Anda sudah like review ini" });
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. BAGIAN RAK BUKU (Custom Shelves)
// ==========================================

// Buat Rak Baru (Contoh: "Favorit 2024")
app.post('/api/shelves', authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO shelves (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.id, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lihat Semua Rak Saya
app.get('/api/shelves', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.name, COUNT(si.book_id) as total_books 
      FROM shelves s
      LEFT JOIN shelf_items si ON s.id = si.shelf_id
      WHERE s.user_id = $1
      GROUP BY s.id
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Masukkan Buku ke Rak
app.post('/api/shelves/:id/add', authenticateToken, async (req, res) => {
  const { book_id } = req.body;
  try {
    // Cek kepemilikan rak
    const check = await pool.query('SELECT * FROM shelves WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) return res.status(403).json({ error: "Rak tidak ditemukan/bukan milik Anda" });

    await pool.query(
      'INSERT INTO shelf_items (shelf_id, book_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, book_id]
    );
    res.json({ message: "Buku berhasil masuk rak" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 5. BAGIAN STATUS BACA (Reading Journey)
// ==========================================

// Update Status & Halaman (Contoh: sedang baca hal 50)
app.put('/api/books/:id/status', authenticateToken, async (req, res) => {
  const { status, current_page } = req.body; // status: 'want-to-read', 'reading', 'read'
  
  try {
    const result = await pool.query(`
      INSERT INTO user_books (user_id, book_id, status, current_page, start_date)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, book_id) 
      DO UPDATE SET status = $3, current_page = $4
      RETURNING *
    `, [req.user.id, req.params.id, status, current_page || 0]);
    
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Endpoint Cek Server
app.get('/', (req, res) => {
  res.send('📚 Book Review API (Monolith Version) is Running...');
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});