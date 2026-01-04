// routes/api.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // Mundur satu folder untuk akses db
const authenticateToken = require('../middleware');
require('dotenv').config();

const router = express.Router();

// ==========================================
// BAGIAN 1: AUTHENTICATION (Login & Register)
// ==========================================

// Register
router.post('/auth/register', async (req, res) => {
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

// Login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User tidak ditemukan' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Password salah' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: "Login berhasil", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// BAGIAN 2: BOOKS (Manajemen Buku)
// ==========================================

// Cari Buku (Search)
router.get('/books/search', async (req, res) => {
  const { title } = req.query;
  if (!title) return res.status(400).json({ error: 'Mohon masukkan query ?title=...' });

  try {
    const result = await pool.query(`
      SELECT b.*, COALESCE(AVG(r.rating), 0)::NUMERIC(2,1) as rating
      FROM books b LEFT JOIN reviews r ON b.id = r.book_id
      WHERE b.title ILIKE $1
      GROUP BY b.id
    `, [`%${title}%`]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Semua Buku
router.get('/books', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books ORDER BY id ASC LIMIT 50');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Satu Buku (Detail)
router.get('/books/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Ambil Info Buku + Reviewnya
    const bookData = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (bookData.rows.length === 0) return res.status(404).json({ error: 'Buku tidak ditemukan' });

    const reviewsData = await pool.query(`
      SELECT r.id, r.rating, r.comment, u.name as reviewer, COUNT(rl.user_id) as likes
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN review_likes rl ON r.id = rl.review_id
      WHERE r.book_id = $1
      GROUP BY r.id, u.name
    `, [id]);

    res.json({ ...bookData.rows[0], reviews: reviewsData.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tambah Buku (Protected)
router.post('/books', authenticateToken, async (req, res) => {
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
// BAGIAN 3: REVIEWS (Ulasan)
// ==========================================

router.post('/reviews', authenticateToken, async (req, res) => {
  const { book_id, rating, comment } = req.body;
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5' });

  try {
    const result = await pool.query(
      'INSERT INTO reviews (book_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [book_id, req.user.id, rating, comment]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// BAGIAN 4: CUSTOM COLLECTIONS (Rak Buku)
// ==========================================

// Buat Rak Baru
router.post('/shelves', authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO shelves (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.id, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Masukkan Buku ke Rak
router.post('/shelves/:id/add', authenticateToken, async (req, res) => {
  const { book_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO shelf_items (shelf_id, book_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, book_id]
    );
    res.json({ message: "Buku berhasil masuk rak" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// BAGIAN 5: SOCIAL ENGAGEMENT (Like Review)
// ==========================================

router.post('/reviews/:id/like', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO review_likes (user_id, review_id) VALUES ($1, $2)',
      [req.user.id, req.params.id]
    );
    res.json({ message: "Review di-like" });
  } catch (err) { res.status(400).json({ message: "Sudah di-like sebelumnya" }); }
});

// ==========================================
// BAGIAN 6: READING JOURNEY (Status Baca)
// ==========================================

router.put('/books/:id/status', authenticateToken, async (req, res) => {
  const { status, current_page } = req.body; // status: 'reading', 'read', 'want-to-read'
  
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

module.exports = router;