// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Panggil file route yang baru kita buat
const apiRoutes = require('./routes/api'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Pasang semua route di bawah path /api
// Contoh akses: localhost:3000/api/auth/login, localhost:3000/api/books, dll
app.use('/api', apiRoutes);

// Endpoint Cek Server
app.get('/', (req, res) => {
  res.send('📚 Book Review API Complete Service is Running...');
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});