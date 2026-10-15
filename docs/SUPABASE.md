# Server Jcuki di Supabase

Proyek **JCuki** (`chzyuktjcyrpbdwvdgsc`) sudah terhubung sejak versi 1.3.0; akun tersedia pada 1.4.0. Pengguna aplikasi tidak perlu memasukkan alamat server atau API key.

## Mulai bersama teman

1. Pasang APK terbaru di setiap Android. Buat akun atau masuk menggunakan email dan password.
2. Pilih **Buat grup**, isi nama, lalu buka tab **Grup**.
3. Kartu grup menampilkan kode, **Bagikan undangan**, **Salin kode** dan **Salin link undangan**. Kirim melalui WhatsApp atau aplikasi pilihanmu.
4. Teman membuka **Gabung grup**, lalu menempelkan kode atau link. Link `jcuki://join?code=…` juga membuka layar konfirmasi jika aplikasi sudah terpasang dan aplikasi pesan mendukung custom scheme. Jika link tidak bisa diketuk, salin/tempel di Jcuki. Ini bukan universal link atau link instalasi.
5. Isi kalender. Setiap orang melihat jam dalam zona waktu perangkatnya, termasuk perubahan DST. Aktifkan zona waktu otomatis di pengaturan HP saat bepergian; Jcuki tidak meminta GPS.
6. **Keluar demo** pada bagian atas layar membawa kembali ke login. Jadwal contoh tidak dikirim ke grup nyata.

## Yang sudah dipasang

- [Dashboard proyek](https://supabase.com/dashboard/project/chzyuktjcyrpbdwvdgsc).
- [Edge Function jcuki](https://supabase.com/dashboard/project/chzyuktjcyrpbdwvdgsc/functions): API profil, foto, grup, undangan, jadwal, rencana, respons, dan aktivitas.
- PostgreSQL schema privat **jcuki**, sembilan tabel. Pilih schema tersebut pada Table Editor untuk melihat data. Schema `public` sengaja tetap kosong.
- Endpoint aplikasi: `https://chzyuktjcyrpbdwvdgsc.supabase.co/functions/v1/jcuki`.
- Pemeriksaan server: tambahkan `/health`; respons normal berisi `JCuki API`.

Aplikasi → Edge Function → PostgreSQL. `backend/index.mjs` memeriksa identitas dan keanggotaan sebelum membaca/mengubah data. Adapter Postgres mempertahankan transaksi batch, parameter SQL, pagination cursor, serta batas 50 anggota/grup. Semua tabel privat mengaktifkan RLS dan menolak akses langsung `anon`/`authenticated`; tidak ada kebijakan publik karena akses dilakukan melalui server. Advisor `RLS Enabled No Policy` di schema privat ini adalah informasi tentang penolakan akses langsung tersebut.

## Akun tanpa email verifikasi

Pendaftaran aplikasi menggunakan `POST /auth/register` pada Edge Function. Isian wajib: full name (2–80), nickname (2–24), email, password (8–128), confirm password yang sama, dan zona IANA otomatis. Server memvalidasi, membatasi pendaftaran 10 percobaan per IP per jam, lalu membuat **akun baru** melalui Supabase Auth Admin dengan `email_confirm: true`. Tidak ada email verifikasi, SMTP, atau email reset yang dikirim oleh alur ini. Email yang sudah terdaftar ditolak dan tidak diperbarui. Setelah dibuat, aplikasi memanggil `signInWithPassword` memakai publishable key.

Lihat akun pada [**Authentication → Users**](https://supabase.com/dashboard/project/chzyuktjcyrpbdwvdgsc/auth/users); lihat profil/jadwal pada **Table Editor → schema jcuki**. Password hanya tersimpan sebagai hash di Supabase Auth. `profiles.auth_user_id` mengacu ke `auth.users.id` dan unik; `full_name` hanya dikirim ke pemilik profil, sedangkan teman melihat nickname. Confirm password tidak disimpan.

JWT diperiksa melalui Supabase Auth `/auth/v1/user`, lalu dipetakan ke profil. Login di perangkat lain mengambil profil/grup yang sama. Sesi native disimpan dalam potongan kecil di SecureStore dengan penulisan manifest atomik; browser memakai AsyncStorage. Logout menghentikan pengingat lokal, melepas push perangkat, dan membuka login. Cache dan foto lokal menggunakan ruang per akun.

Upgrade dari versi lama: pada permintaan akun pertama, aplikasi dapat menyertakan bukti token perangkat lama untuk menautkan profil yang belum dimiliki akun. Keanggotaan dan jadwal tetap memakai ID lama. Setelah ditautkan, token perangkat saja ditolak. Jika aplikasi lama sudah dihapus beserta tokennya sebelum ditautkan, nickname atau kode grup tidak cukup untuk memulihkan identitas lama.

`verify_jwt=false` mempertahankan kompatibilitas identitas lama; fungsi **tetap memvalidasi JWT sendiri** dan memeriksa anggota grup. Database URL, `SUPABASE_SERVICE_ROLE_KEY`, dan anon runtime key berasal dari secret bawaan Supabase. Hanya URL dan publishable key boleh masuk APK; jangan memasukkan service_role/password database ke `EXPO_PUBLIC_*`. Tidak perlu mengubah setting konfirmasi email proyek: endpoint aplikasi hanya mengaktifkan akun baru yang dibuatnya.

## Mengembangkan dan deploy ulang

Migration tersedia di `supabase/migrations/`. Backend Cloudflare lama tetap dapat dipakai untuk pengujian/alternatif, tetapi APK resmi kini memakai Supabase. Jangan menjalankan migration SQLite dari `backend/migrations/` pada PostgreSQL.

Dengan CLI Supabase yang sudah diautentikasi ke akun pengelola:

```sh
supabase --version
supabase link --project-ref chzyuktjcyrpbdwvdgsc
supabase migration list
# Untuk database baru, atau migration lokal baru yang belum diterapkan:
supabase db push
supabase functions deploy jcuki --project-ref chzyuktjcyrpbdwvdgsc
```

Migration awal sudah diterapkan pada proyek ini. Periksa history sebelum menjalankan `db push`; jangan mengulang pembuatan tabel. `supabase/config.toml` mendefinisikan autentikasi fungsi. Import relatif membawa handler bersama di `backend/` saat deployment.

`EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` opsional untuk proyek Auth sendiri. Deploy migration dan fungsi pada proyek yang sama. Backend Cloudflare alternatif belum menyediakan implementasi Admin Auth; gunakan Supabase untuk pendaftaran resmi.

`EXPO_PUBLIC_API_URL` opsional untuk developer, misalnya backend lokal; tanpa override aplikasi memakai alamat proyek di atas. Untuk preview web, atur secret `ALLOWED_ORIGINS` berisi origin web yang tepat, dipisahkan koma. Native tidak memerlukan CORS origin. Jangan mengizinkan origin sembarang untuk sekadar menutupi error konfigurasi.

## Notifikasi

Riwayat aktivitas dan sinkronisasi foreground sudah bekerja. Pengingat mingguan lokal dapat digunakan setelah pengguna mengizinkan notifikasi.

Push saat aplikasi tertutup **belum aktif**: masih membutuhkan proyek Expo/EAS, Firebase untuk Android, APNs untuk iPhone, dan APK baru dengan konfigurasi tersebut. `PUSH_ENABLED` default `false`. Ikuti [panduan notifikasi](NOTIFICATIONS.md), termasuk cron untuk retry/receipt; membuat proyek Supabase saja tidak menyiapkan kredensial push.

## Pemeriksaan masalah

- **Mode demo:** tekan **Keluar demo**, lalu buat akun/masuk dan buat/gabung grup.
- **Kode ditolak:** salin kode 12 karakter dari grup nyata; kode demo bukan undangan aktif.
- **Tidak tersambung:** periksa internet, status proyek di Supabase, lalu log Edge Function. Health endpoint menguji fungsi; mencoba membuat grup menguji database juga.
- **Jam berbeda:** itu normal jika perangkat berbeda zona; interval disimpan sebagai UTC. Periksa zona otomatis HP.
- **Data tidak tampak di public:** pilih schema `jcuki` di dashboard.

Advisor Auth dapat menampilkan [Leaked Password Protection Disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); pengelola dapat mengaktifkannya sesuai paket proyek. [RLS Enabled No Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) pada schema privat disengaja: akses langsung ditolak dan seluruh operasi melalui API server.

### Perbaikan klien 1.5.0

Login yang berhasil selalu memakai endpoint server dari konfigurasi build. URL kosong atau mode demo dari cache lama tidak lagi memindahkan akun aktif ke ruang lokal. Profil memakai ID server yang disimpan untuk tampilan offline, lalu diverifikasi ulang bersama daftar grup. Status gagal/berhasil sinkronisasi terlihat pada halaman akun dan header. Bila pendaftaran berhasil tetapi login setelahnya terputus, pesan membedakan akun yang sudah dibuat dan mengarahkan ke login dengan email terisi.

Foto privat tidak lagi diserahkan langsung ke komponen Image dengan header sesi lama. Klien mengambil byte gambar dengan sesi terkini, mencoba refresh sekali pada 401, memvalidasi jenis/ukuran, lalu menyimpan cache per akun. Direktori dokumen native bertahan setelah cache OS dibersihkan. Versi URL mengikuti perubahan foto di server.
