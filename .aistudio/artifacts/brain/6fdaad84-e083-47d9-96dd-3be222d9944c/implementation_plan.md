# Proteksi Password Sebelum Masuk Website (Full-Screen Access Gate)

Menambahkan gerbang autentikasi password layar penuh sebelum pengguna dapat mengakses atau melihat halaman website Schedule Start Reaktor PVC 5, terintegrasi langsung dengan database yang terhubung saat ini serta dilengkapi fitur auto-lock 5 menit tanpa aktivitas dan kontrol keamanan di Side Toolbar.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berikut adalah keputusan utama yang telah dikonfirmasi untuk diterapkan pada sistem proteksi website:

- **Layar Kunci Penuh (Full-Screen Gate)**: Saat website pertama kali dibuka atau dalam kondisi terkunci, seluruh halaman website ditutupi penuh oleh layar autentikasi khusus tanpa menampilkan isi dashboard di belakangnya.
- **Wajib Buat Password Saat Pertama Kali**: Jika belum ada password yang tersimpan di database, layar masuk otomatis meminta pengguna membuat password baru terlebih dahulu sebelum dapat masuk ke dalam website.
- **Penghentian Alarm & Suara Saat Terkunci**: Selama website berada di layar kunci, seluruh suara alarm jadwal reaktor, speech synthesis, dan pemicu peringatan layar penuh dihentikan sementara hingga password berhasil dibuka.
- **Kontrol Tetap di Side Toolbar & Auto-Lock 5 Menit**: Setelah masuk ke website, tombol **Kunci Sekarang** (beserta hitung mundur `05:00` tanpa aktivitas) dan tombol **Ubah Password** tetap berada di **Side Toolbar** (tidak ada di Header). Membuka tab/halaman website baru akan langsung mengunci website kembali.

---

## 1. Overview & Core Concept

- **What It Does**: Menghadirkan layar masuk berpassword (login/setup gate) yang mengamankan akses ke seluruh website Schedule Start Reaktor PVC 5. Pengguna hanya dapat melihat dan mengoperasikan dashboard setelah memasukkan password yang valid.
- **Target Audience / Persona**: Operator dan tim ruang kontrol Reaktor PVC 5 yang membutuhkan pembatasan akses penuh agar jadwal, parameter proses, dan alarm tidak diakses tanpa otorisasi.
- **Key Value**: Keamanan menyeluruh sejak halaman pertama kali dimuat, sinkronisasi password terpusat di database, serta penguncian otomatis saat operator meninggalkan layar selama 5 menit atau membuka tab baru.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Pertama Kali Masuk (Belum Ada Password di Database)**:
   - Setelah koneksi ke database selesai, jika belum ada password tersimpan, pengguna disambut layar penuh **Buat Password Website**.
   - Pengguna mengisi *Password Baru* dan *Konfirmasi Password Baru*, lalu menekan **Simpan & Masuk Website**.
   - Password disimpan ke database dan pengguna langsung masuk ke halaman utama dashboard dengan timer aktivitas 5 menit menyala.
2. **Masuk ke Website (Password Sudah Ada)**:
   - Setiap kali membuka website, me-refresh halaman, atau membuka tab baru, pengguna melihat layar penuh **Masuk Website Schedule Start Reaktor PVC 5**.
   - Pengguna memasukkan password (dilengkapi tombol lihat/sembunyikan karakter) untuk membuka akses, atau dapat memilih opsi **Ubah Password** langsung dengan memverifikasi password lama terlebih dahulu.
3. **Selama di Dalam Website (Side Toolbar Controls)**:
   - Di **Side Toolbar** (bukan di Header), tersedia tombol **Kunci Sekarang** yang menampilkan hitung mundur waktu aktif (`05:00`) secara *real-time* (`tabular-nums`) serta tombol **Ubah Password**.
   - Setiap gerakan mouse, klik, sentuhan layar, atau ketikan keyboard me-reset hitung mundur kembali ke `05:00`.
   - Jika 5 menit berlalu tanpa aktivitas, atau pengguna menekan **Kunci Sekarang**, website seketika kembali ke layar kunci penuh dan menghentikan seluruh suara alarm yang sedang berjalan.

### Visual Identity & Theme
- **Aesthetic Direction**: Industrial Control Room Console — bersih, kontras tinggi, fokus pada satu kartu autentikasi presisi di tengah layar penuh (`100vh`).
- **Color Palette & Mood**:
  - *Dominant Canvas (60%)*: Deep Slate (`bg-slate-950` pada mode gelap / `bg-slate-100` pada mode terang) yang menutup penuh viewport.
  - *Structural Surface (30%)*: Kartu autentikasi terpusat (`bg-white dark:bg-slate-900`) dengan garis batas halus (`border-slate-200 dark:border-slate-800`).
  - *Accent Budget (10%)*: Biru industrial (`bg-blue-600`) untuk aksi masuk/ubah password dan Emerald (`bg-emerald-600`) untuk pembuatan password baru serta indikator sesi terbuka di Side Toolbar.
- **Typography & Hierarchy**:
  - Judul layar kunci tegas dan mudah dibaca dari jarak ruang kontrol, dipadukan dengan angka hitung mundur berformat `font-mono tabular-nums` agar tidak bergeser saat detik berjalan.
- **Interactive Feedback & Motion**:
  - Fokus otomatis (`autoFocus`) pada kolom input password saat layar kunci tampil sehingga operator dapat langsung mengetik dan menekan `Enter`.
  - Pesan validasi yang jelas jika password salah atau konfirmasi tidak cocok.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Render Gate Sebelum Dashboard vs Modal di Atas Dashboard**
  - *Chosen Approach*: Mengembalikan komponen layar kunci penuh sebelum merender pohon komponen dashboard dan menonaktifkan efek pemicu alarm ketika status terkunci.
  - *Why*: Memastikan tidak ada elemen dashboard yang terlihat dan tidak ada suara alarm reaktor yang berbunyi sebelum operator membuka kunci website.
  - *Alternatives Considered*: Menampilkan modal di atas dashboard yang diburamkan — dilewati karena pengguna menginginkan layar kunci penuh sebelum masuk ke website dan penghentian seluruh alarm saat terkunci.
- **Decision 2: Penyimpanan Password di Database & Status Sesi di Memori**
  - *Chosen Approach*: Menyimpan nilai password di database Supabase yang terhubung saat ini, sementara status `isDashboardUnlocked` hanya disimpan di memori state aplikasi.
  - *Why*: Memastikan perubahan password langsung tersinkronisasi di database, sekaligus menjamin setiap pembukaan halaman/tab website baru otomatis terkunci kembali.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Database Terhubung (Supabase)                       │
│         Penyimpanan Password & Sinkronisasi Pengaturan Sistem           │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Pengelola State Keamanan & Sesi                      │
│  • hasDashboardPassword : Apakah password sudah ada di database         │
│  • isWebsiteUnlocked    : Status sesi buka kunci (memori aktif)         │
│  • lockCountdown (300s) : Timer 5 menit reset otomatis saat aktivitas   │
└─────────────────┬─────────────────────────────────────┬─────────────────┘
                  │                                     │
      [Terkunci / Belum Ada Password]             [ Sudah Terbuka ]
                  │                                     │
                  ▼                                     ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│   Layar Kunci Penuh (Entry Gate)  │ │     Halaman Utama Dashboard       │
│  • Mode Buat Password Pertama     │ │  • Alarm & Jadwal Reaktor Aktif   │
│  • Mode Masukkan Password Masuk   │ │  • Side Toolbar (Tanpa Header):   │
│  • Mode Ubah Password (Lama/Baru) │ │    - Tombol "Kunci Sekarang"      │
│  • Semua Alarm & Audio Dihentikan │ │      + Countdown 05:00            │
│                                   │ │    - Tombol "Ubah Password"       │
└───────────────────────────────────┘ └───────────────────────────────────┘
```

### Interactive Component & State Mapping
- **Gate Autentikasi Layar Penuh**:
  - Jika database belum memiliki password (`!hasDashboardPassword`), paksa tampilan ke mode pembuatan password baru (`create`).
  - Jika password sudah ada namun sesi belum dibuka (`!isDashboardUnlocked`), tampilkan layar masuk (`unlock`) dengan opsi beralih ke mode ubah password (`change`).
- **Kontrol Audio & Alarm**:
  - Saat beralih ke kondisi terkunci (`lockDashboardNow`), hentikan `window.speechSynthesis` yang sedang berjalan dan cegah pemicu `playAlarmSound` maupun *Full Screen Alert* sampai `isDashboardUnlocked` bernilai `true`.
- **Side Toolbar (`Sidebar`)**:
  - Menampilkan tombol **Kunci Sekarang** dengan hitung mundur `MM:SS` yang langsung mengembalikan tampilan ke Layar Kunci Penuh saat diklik atau saat waktu habis (`00:00`), serta tombol **Ubah Password** yang membuka dialog perubahan password di dalam dashboard.
