# Sistem INM RS Royal Prima Jambi

Sistem pemantauan **Indikator Mutu Nasional (INM)** Rumah Sakit Royal Prima Jambi.

Setiap ruangan/unit memiliki set indikator yang berbeda. Saat login, user hanya
melihat & mengelola indikator unitnya (kecuali Admin / Komite Mutu / Direktur
yang melihat semua unit).

## Tech Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **MySQL 9** (via Prisma 6 ORM)
- **Auth.js v5** (NextAuth) — Credentials provider, JWT session
- **Tailwind CSS v4** + **lucide-react** icons
- **Recharts** untuk grafik
- **Zod** + **react-hook-form** untuk validasi form

## Setup Lokal (Dev)

### 1. Prerequisites

- Node.js 22+ (sudah terinstall: v22.14.0)
- MySQL 8/9 (sudah terinstalled: MySQL 9.2.0 via Homebrew)
- npm 11+

### 2. Buat database MySQL

Login ke MySQL sebagai root:

```bash
mysql -u root -p
```

Lalu jalankan:

```sql
CREATE DATABASE inm_rs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'inm_rs'@'localhost' IDENTIFIED BY 'inm_rs_dev_password';
GRANT ALL PRIVILEGES ON inm_rs.* TO 'inm_rs'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Konfigurasi env

Edit `web/.env`:

```bash
DATABASE_URL="mysql://inm_rs:inm_rs_dev_password@localhost:3306/inm_rs"
AUTH_SECRET="generate-dengan: openssl rand -base64 32"
```

### 4. Jalankan migrasi + seed

```bash
cd web
npm run db:migrate    # buat semua tabel
npm run db:seed       # isi 8 unit + 12 indikator + user demo
```

### 5. Jalankan dev server

```bash
npm run dev
```

Buka http://localhost:3000 → akan redirect ke /login.

## Akun Demo

Setelah seed, gunakan akun berikut (password semuanya: `password123`):

| Email | Role | Akses |
|---|---|---|
| `admin@rsrpjambi.id` | ADMIN | Semua unit, kelola user |
| `komite.mutu@rsrpjambi.id` | KOMITE_MUTU | Semua unit, approve analisa |
| `pic.farmasi@rsrpjambi.id` | PIC_UNIT | Hanya FARMASI |
| `pic.ok@rsrpjambi.id` | PIC_UNIT | Hanya OK |
| `pic.rawat_inap@rsrpjambi.id` | PIC_UNIT | Hanya RAWAT_INAP |
| `pic.laboratorium@rsrpjambi.id` | PIC_UNIT | Hanya LABORATORIUM |
| `pic.poliklinik@rsrpjambi.id` | PIC_UNIT | Hanya POLIKLINIK |
| `pic.pipp@rsrpjambi.id` | PIC_UNIT | Hanya PIPP |
| `pic.kabid@rsrpjambi.id` | PIC_UNIT | Hanya KABID |
| `pic.ppi@rsrpjambi.id` | PIC_UNIT | Hanya PPI |

## Role & Hak Akses

| Role | Lihat Indikator | Input Harian | Submit Analisa | Approve Analisa | Manage User |
|---|---|---|---|---|---|
| ADMIN | Semua unit | ✓ | ✓ | ✓ | ✓ |
| KOMITE_MUTU | Semua unit | ✓ | ✓ | ✓ | ✗ |
| DIREKTUR | Semua unit | ✗ | ✗ | ✗ | ✗ |
| PIC_UNIT | Unit sendiri | ✓ | ✓ | ✗ | ✗ |
| DATA_COLLECTOR | Unit sendiri | ✓ | ✗ | ✗ | ✗ |

## Struktur Project

```
web/
├── prisma/
│   ├── schema.prisma     # Skema DB: users, units, indicators, observations, analyses, dll
│   └── seed.ts           # Seeder: 8 unit + 12 indikator + 10 user demo
├── src/
│   ├── app/
│   │   ├── (app)/        # Route group authenticated (sidebar + header)
│   │   │   ├── dashboard/
│   │   │   ├── indikator/
│   │   │   ├── input/    # Form input harian
│   │   │   ├── analisa/  # Analisa bulanan + PDSA (TODO)
│   │   │   └── admin/    # Manajemen user + master (TODO)
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/   # NextAuth route handler
│   │   │   └── observations/         # GET observations per indicator+month
│   │   ├── login/        # Halaman login (public)
│   │   ├── layout.tsx    # Root layout (font, metadata)
│   │   └── page.tsx      # / redirect ke /dashboard
│   ├── components/       # Sidebar, Header, InputForm (client components)
│   ├── lib/              # prisma.ts, auth-helpers.ts, utils.ts
│   ├── auth.ts           # Konfigurasi NextAuth
│   └── middleware.ts     # Protect routes (redirect ke /login)
├── .env                  # DATABASE_URL, AUTH_SECRET (jangan commit!)
├── .env.example
└── package.json
```

## Status Implementasi

- [x] Auth login (Credentials + JWT + role)
- [x] RBAC filtering per unit
- [x] Dashboard dengan stat cards + breakdown per unit
- [x] Daftar indikator (filter unit)
- [x] Detail indikator dengan summary bulan berjalan
- [x] Form input data harian (1–31) dengan auto-save
- [ ] Form analisa bulanan + PDSA + workflow approval
- [ ] Manajemen user (CRUD oleh ADMIN)
- [ ] Master data unit & indikator (CRUD oleh ADMIN)
- [ ] Grafik tren di dashboard (Recharts)
- [ ] Export Excel per periode
- [ ] Audit log viewer

## Deploy ke VPS / On-prem

Untuk produksi (on-prem RS):

```bash
# Build
npm run build

# Jalankan dengan PM2 (recommended)
npm install -g pm2
pm2 start npm --name "inm-rs" -- start
pm2 save
pm2 startup

# Atau pakai Docker (TODO: Dockerfile + docker-compose.yml)
```

Reverse proxy dengan Nginx + SSL (Let's Encrypt). Detail menyusul.

## Source Data

Master data 8 unit & 12 indikator diekstrak dari file Excel asli:
`/Users/admin/Desktop/SENSUS INM.xlsx` (sheet: FARMASI, OK, RAWAT_INIP,
LABORATORIUM, POLIKLINIK, PIPP, KABID, PPI).
