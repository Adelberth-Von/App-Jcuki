# Server Jcuki di Supabase

Proyek **JCuki** (`chzyuktjcyrpbdwvdgsc`) sudah terhubung pada versi 1.3.0. Pengguna aplikasi tidak perlu memasukkan alamat server atau API key.

## Mulai bersama teman

1. Pasang APK terbaru di setiap Android. Masukkan panggilan dan lanjutkan.
2. Pilih **Buat grup**, isi nama, lalu buka tab **Grup**.
3. Kartu **Ajak teman bergabung** menyediakan **Salin kode** dan **Salin link undangan**. Kirim melalui WhatsApp atau aplikasi pilihanmu.
4. Teman membuka **Gabung grup**, lalu menempelkan kode atau link. Link `jcuki://join?code=…` juga membuka layar konfirmasi jika aplikasi sudah terpasang dan aplikasi pesan mendukung custom scheme. Jika link tidak bisa diketuk, salin/tempel di Jcuki. Ini bukan universal link atau link instalasi.
5. Isi kalender. Setiap orang melihat jam dalam zona waktu perangkatnya, termasuk perubahan DST. Aktifkan zona waktu otomatis di pengaturan HP saat bepergian; Jcuki tidak meminta GPS.
6. **Keluar demo** pada bagian atas layar membawa kembali ke sambutan. Jadwal contoh tidak dikirim ke grup nyata.

## Yang sudah dipasang

- [Dashboard proyek](https://supabase.com/dashboard/project/chzyuktjcyrpbdwvdgsc).
- [Edge Function jcuki](https://supabase.com/dashboard/project/chzyuktjcyrpbdwvdgsc/functions): API profil, foto, grup, undangan, jadwal, rencana, respons, dan aktivitas.
- PostgreSQL schema privat **jcuki**, sembilan tabel. Pilih schema tersebut pada Table Editor untuk melihat data. Schema `public` sengaja tetap kosong.
- Endpoint aplikasi: `https://chzyuktjcyrpbdwvdgsc.supabase.co/functions/v1/jcuki`.
- Pemeriksaan server: tambahkan `/health`; respons normal berisi `JCuki API`.

Aplikasi → Edge Function → PostgreSQL. `backend/index.mjs` memeriksa identitas dan keanggotaan sebelum membaca/mengubah data. Adapter Postgres mempertahankan transaksi batch, parameter SQL, pagination cursor, serta batas 50 anggota/grup. Semua tabel privat mengaktifkan RLS dan menolak akses langsung `anon`/`authenticated`; tidak ada kebijakan publik karena akses dilakukan melalui server. Advisor `RLS Enabled No Policy` di schema privat ini adalah informasi tentang penolakan akses langsung tersebut.

Identitas masih berupa token perangkat acak 256-bit yang disimpan SecureStore di native, bukan akun Supabase Auth. Server memakai digest SHA-256 sebagai ID. Nickname/kode grup bukan token autentikasi. Menghapus data aplikasi atau kehilangan token dapat kehilangan akses profil; pemulihan akun lintas perangkat belum tersedia. Jangan membagikan token perangkat. Foto hanya dapat dibaca pemilik dan sesama anggota grup.

`verify_jwt=false` diperlukan karena autentikasi khusus tersebut; pemeriksaan identitas tetap berjalan di fungsi. Database URL hanya berasal dari secret bawaan runtime Supabase, tidak disertakan ke APK. Tidak perlu menyalin `service_role`, password database, atau secret key ke aplikasi.

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

`EXPO_PUBLIC_API_URL` opsional untuk developer, misalnya backend lokal; tanpa override aplikasi memakai alamat proyek di atas. Untuk preview web, atur secret `ALLOWED_ORIGINS` berisi origin web yang tepat, dipisahkan koma. Native tidak memerlukan CORS origin. Jangan mengizinkan origin sembarang untuk sekadar menutupi error konfigurasi.

## Notifikasi

Riwayat aktivitas dan sinkronisasi foreground sudah bekerja. Pengingat mingguan lokal dapat digunakan setelah pengguna mengizinkan notifikasi.

Push saat aplikasi tertutup **belum aktif**: masih membutuhkan proyek Expo/EAS, Firebase untuk Android, APNs untuk iPhone, dan APK baru dengan konfigurasi tersebut. `PUSH_ENABLED` default `false`. Ikuti [panduan notifikasi](NOTIFICATIONS.md), termasuk cron untuk retry/receipt; membuat proyek Supabase saja tidak menyiapkan kredensial push.

## Pemeriksaan masalah

- **Mode demo:** tekan **Keluar demo**, lalu lengkapi panggilan dan buat/gabung grup.
- **Kode ditolak:** salin kode 12 karakter dari grup nyata; kode demo bukan undangan aktif.
- **Tidak tersambung:** periksa internet, status proyek di Supabase, lalu log Edge Function. Health endpoint menguji fungsi; mencoba membuat grup menguji database juga.
- **Jam berbeda:** itu normal jika perangkat berbeda zona; interval disimpan sebagai UTC. Periksa zona otomatis HP.
- **Data tidak tampak di public:** pilih schema `jcuki` di dashboard.
