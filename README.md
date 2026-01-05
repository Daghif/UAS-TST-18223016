# Book Review API

Backend RESTful API untuk sistem manajemen buku dan review ala Goodreads. Dibangun menggunakan **Node.js**, **Express**, dan **PostgreSQL**. Aplikasi ini dirancang dengan fokus pada keamanan data (JWT & Bcrypt), efisiensi memori, dan integritas data.

**Link Deploy Backend:** https://thegift.theokaitou.my.id/

---

## Fitur Utama

- **Autentikasi Aman:** Registrasi & Login menggunakan JWT (JSON Web Token) dan hashing password (Bcrypt).
- **Manajemen Buku:** Pencarian buku (Partial Match) dengan rating rata-rata.
- **Review & Rating:** User dapat memberikan review dan rating (1-5⭐) pada buku.
- **Like Review:** Sistem sosial dengan fitur like pada review user lain.
- **Rak Buku Kustom:** User dapat membuat rak buku pribadi (misal: "Favorit 2024").
- **Status Baca:** Tracking progress membaca (Want to Read, Reading, Read, DNF).
- **Import Goodreads:** Script untuk import koleksi buku dari file CSV Goodreads.
- **Optimasi Memori:** Konfigurasi Connection Pooling database untuk performa tinggi.
- **Containerized:** Siap dijalankan menggunakan Docker & Docker Compose.

---

## Teknologi yang Digunakan

| Teknologi | Deskripsi |
|-----------|-----------|
| [Node.js](https://nodejs.org/) | Runtime Environment |
| [Express.js](https://expressjs.com/) | Web Framework |
| [PostgreSQL](https://www.postgresql.org/) | Database (dihosting di Neon) |
| [JWT](https://jwt.io/) | Autentikasi Token |
| [Bcrypt](https://www.npmjs.com/package/bcryptjs) | Password Hashing |
| [Docker](https://www.docker.com/) | Containerization |

---

## Persyaratan Sistem

Sebelum menjalankan, pastikan kamu memiliki:

- **Docker Desktop** (Disarankan)
- Atau **Node.js v18+** (Jika ingin menjalankan manual tanpa Docker)
- URL Koneksi Database PostgreSQL (misal: dari Neon.tech, Supabase, atau Localhost)

---

## Cara Menjalankan (Docker - Disarankan)

### 1. Clone Repository

```bash
git clone https://github.com/Daghif/UAS-TST-18223016.git
cd UAS-TST-18223016
```

### 2. Buat File `.env`

Buat file baru bernama `.env` di folder root, lalu isi dengan konfigurasi berikut:

```env
DATABASE_URL=postgres://user:password@host:port/database?sslmode=require
JWT_SECRET=rahasia_super_aman_ganti_ini
PORT=3000
```

### 3. Jalankan dengan Docker Compose

```bash
docker-compose up --build -d
```

### 4. Selesai!

API berjalan di: `http://localhost:9494`

---

## Cara Menjalankan (Manual / Localhost)

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

Pastikan file `.env` sudah dibuat seperti langkah di atas.

### 3. Setup Database

```bash
node setup.js
```

### 4. (Opsional) Seed Data Awal

```bash
node seed.js
```

### 5. Jalankan Server

```bash
node index.js
```

Server akan berjalan di `http://localhost:3000`

---

## Dokumentasi API

**Base URL (Docker):** `http://localhost:9494`  
**Base URL (Deploy):** `https://thegift.theokaitou.my.id`

---

### 1. Autentikasi (User)

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `POST` | `/api/auth/register` | Mendaftarkan pengguna baru | Public |
| `POST` | `/api/auth/login` | Login user & mendapatkan Token | Public |

#### Register - Request Body
```json
{
  "email": "user@email.com",
  "name": "Nama User",
  "password": "password123"
}
```

#### Login - Request Body
```json
{
  "email": "user@email.com",
  "password": "password123"
}
```

---

### 2. Buku (Books)

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `GET` | `/api/books` | List semua buku dengan rating rata-rata | Public |
| `GET` | `/api/books/search?title=...` | Cari buku berdasarkan judul | Public |
| `GET` | `/api/books/:id` | Detail buku lengkap dengan review | Public |
| `POST` | `/api/books` | Tambah buku baru | Token |

#### Tambah Buku - Request Body
```json
{
  "title": "Judul Buku",
  "author": "Nama Penulis",
  "description": "Deskripsi buku",
  "total_pages": 300
}
```

---

### 3. Review & Rating

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `GET` | `/api/my-reviews` | Lihat semua review saya | Token |
| `POST` | `/api/reviews` | Tambah review baru | Token |
| `POST` | `/api/reviews/:id/like` | Like review orang lain | Token |

#### Tambah Review - Request Body
```json
{
  "book_id": 1,
  "rating": 5,
  "comment": "Buku yang sangat bagus!"
}
```

---

### 4. Rak Buku (Shelves)

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `GET` | `/api/shelves` | Lihat semua rak saya | Token |
| `GET` | `/api/shelves/:id` | Detail rak dengan isi buku | Token |
| `POST` | `/api/shelves` | Buat rak baru | Token |
| `POST` | `/api/shelves/:id/add` | Masukkan buku ke rak | Token |
| `DELETE` | `/api/shelves/:id/remove` | Hapus buku dari rak | Token |
| `DELETE` | `/api/shelves/:id` | Hapus rak (beserta isinya) | Token |

#### Buat Rak - Request Body
```json
{
  "name": "Favorit 2024"
}
```

#### Tambah Buku ke Rak - Request Body
```json
{
  "book_id": 1
}
```

---

### 5. Status Baca (Reading Status)

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `PUT` | `/api/books/:id/status` | Update status & progress baca | Token |

#### Update Status - Request Body
```json
{
  "status": "reading",
  "current_page": 50
}
```

**Status yang tersedia:**
- `want-to-read` - Ingin dibaca
- `reading` - Sedang dibaca
- `read` - Sudah selesai
- `dnf` - Did Not Finish

---

## Autentikasi

Untuk endpoint yang memerlukan **Token**, tambahkan header berikut:

```
Authorization: Bearer <your_jwt_token>
```

Token didapatkan setelah login berhasil.

---

## Struktur Database

```
├── users           # Data pengguna
├── books           # Katalog buku
├── reviews         # Review & rating
├── user_books      # Status baca per user
├── shelves         # Rak buku kustom
├── shelf_items     # Relasi buku-rak
└── review_likes    # Like pada review
```

---

## Catatan Keamanan & Optimasi

- **JWT Authentication:** Semua endpoint sensitif dilindungi dengan token JWT yang expire dalam 24 jam.
- **Password Hashing:** Password user di-hash menggunakan bcrypt dengan salt rounds 10.
- **Connection Pooling:** Aplikasi dikonfigurasi dengan connection pool PostgreSQL untuk performa optimal.
- **Docker Optimization:** Dockerfile menggunakan teknik layer caching (copy package.json duluan) untuk mempercepat proses build ulang.
- **CORS Enabled:** API dapat diakses dari frontend di domain berbeda.

---

## Struktur Project

```
├── index.js              # Entry point & semua routes
├── db.js                 # Konfigurasi database PostgreSQL
├── middleware.js         # JWT authentication middleware
├── setup.js              # Script membuat tabel database
├── seed.js               # Script seeding data contoh
├── seed_goodreads.js     # Script import dari CSV Goodreads
├── Dockerfile            # Konfigurasi Docker image
├── docker-compose.yml    # Konfigurasi Docker Compose
├── .env.example          # Template environment variables
└── package.json          # Dependencies & scripts
```

---

## Author

**Daghif** - UAS TST 18223016

---

