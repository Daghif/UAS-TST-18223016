// index.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Import bcrypt
const jwt = require('jsonwebtoken'); // Import jwt
const pool = require('./db');
const authenticateToken = require('./middleware'); // Import middleware
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- ROUTES AUTHENTICATION ---

// 1. REGISTER (Daftar User Baru)
app.post('/api/auth/register', async (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Semua field wajib diisi!' });
  }

  try {
    // Hash password sebelum disimpan
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

// 2. LOGIN (Masuk untuk dapat Token)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Cari user berdasarkan email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User tidak ditemukan' });

    const user = result.rows[0];

    // Cek kecocokan password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Password salah' });

    // Buat Token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' } // Token berlaku 1 jam
    );

    res.json({ message: "Login berhasil", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROUTES PUBLIC (Bisa diakses siapa saja) ---

// 3. GET Semua Buku
app.get('/api/books', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.title, b.author, b.description,
      COALESCE(AVG(r.rating), 0)::NUMERIC(2,1) AS average_rating,
      COUNT(r.id) AS review_count
      FROM books b
      LEFT JOIN reviews r ON b.id = r.book_id
      GROUP BY b.id ORDER BY b.id ASC;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- ROUTES PROTECTED (Harus Login / Pakai Token) ---

// 4. POST Tambah Buku (Butuh Token)
app.post('/api/books', authenticateToken, async (req, res) => {
  const { title, author, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO books (title, author, description) VALUES ($1, $2, $3) RETURNING *',
      [title, author, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. POST Tambah Review (Butuh Token - User ID diambil otomatis dari token)
app.post('/api/reviews', authenticateToken, async (req, res) => {
  const { book_id, rating, comment } = req.body;
  const user_id = req.user.id; // AMBIL ID DARI TOKEN (Bukan dari body)

  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating harus 1-5' });

  try {
    const result = await pool.query(
      'INSERT INTO reviews (book_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [book_id, user_id, rating, comment]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Gagal menambah review' });
  }
});

app.listen(PORT, () => {
  console.log(`Server JWT berjalan di http://localhost:${PORT}`);
});

// 3b. GET Satu Buku (Versi Flat / Tidak Bertumpuk)
app.get('/api/books/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Kita pakai JOIN biasa, tanpa GROUP BY
    const result = await pool.query(`
      SELECT 
        b.title AS judul_buku, 
        b.author AS penulis,
        u.name AS nama_pemberi_review,
        r.rating, 
        r.comment AS isi_review
      FROM books b
      LEFT JOIN reviews r ON b.id = r.book_id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Buku tidak ditemukan' });
    }

    // Langsung kirim array baris apa adanya
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});