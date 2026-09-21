# Uygulama Planı — Abonelik ve Lisans Takip

Kaynak: `docs/spec.md`. Bu dosya, uçtan uca çalışan sistemin hangi adımlarla
kurulduğunu ve her adımın "bitti" tanımını içerir.

## Hedef

Tek komutla (`pnpm dev`) ayağa kalkan, giriş yapılabilen, dört hesabın
aboneliklerini yöneten, yenilenme tarihlerini otomatik hesaplayan ve gideri
raporlayan çalışır bir panel.

## Teknoloji sapmaları (spec'ten)

| Spec | Gerçekleşen | Gerekçe |
|---|---|---|
| Next.js 15 | Next.js 16.3.5 | `create-next-app@latest` bu sürümü kuruyor. App Router API'si aynı; uyumsuzluk yok. |
| — | Zod v4 | Güncel major. Şema söz dizimi spec'teki kullanımla uyumlu. |

Bunun dışında tüm kararlar spec'e sadık: SQLite + Drizzle, Auth.js v5
credentials, Tailwind v4, date-fns, Recharts, Resend.

## Adımlar

1. **İskelet + bağımlılıklar** — Next 16, Tailwind v4, klasör yapısı §9. ✅
2. **Şema + migration** — `src/db/schema.ts` (§4.2, tüm tablolar), `data/app.db`.
   Bitti tanımı: `pnpm db:migrate` tabloları oluşturur.
3. **`src/lib/renewal.ts`** — §5.1. Önce `tests/renewal.test.ts` içindeki beş
   vaka yazılır, sonra fonksiyon. Bitti tanımı: `pnpm test` yeşil.
4. **`src/lib/money.ts`** — §5.2–5.3 aylık eşdeğer, kur, durum sınıfları.
   Kur yoksa TL toplamı yok. Testleriyle.
5. **`src/db/seed.ts`** — dört hesap (design, dev, dev2, management) +
   dört kullanıcı + örnek abonelikler. Bitti tanımı: panel boş açılmaz.
6. **Auth.js v5** — credentials, bcrypt, middleware koruması. Sign-up yok.
7. **Server Actions + Zod** — §6'daki sekiz action, şemalar paylaşımlı.
8. **Panel `/`** — özet kutuları, hesap filtresi, abonelik listesi.
9. **Zaman şeridi** — 60 gün (mobilde 30), hesap renkleriyle.
10. **Detay sayfası + form + kota kaydırıcısı** — `/subscriptions/[id]`.
11. **Hatırlatma görevi** — `/api/cron/reminders`, `reminder_log` mükerrer engeli,
    `EMAIL_PROVIDER=none` ile mail kapalı çalışır.
12. **Ayarlar + hesaplar + raporlar + export** — kur girişi, JSON yedek/geri yükleme, CSV.

## Doğrulama (her adım sonunda)

- `pnpm test` — birim testleri
- `pnpm lint` — ESLint
- `pnpm build` — tip hataları dahil tam derleme

## Kabul kriterleri (§13) — doğrulama sonuçları

- [x] Yenilenme tarihi hiçbir zaman geçmişte görünmez — `nextRenewal` testleri
- [x] 31'inde başlayan abonelik Şubat'ta 28, Mart'ta 31 — test edildi
- [x] Yıllık abonelik aylık toplama 1/12 yansır — `money.test.ts`
- [x] Kur girilmediğinde uydurma kur yok, panelde "kuru girilmedi" uyarısı çıkıyor
- [x] Aynı hatırlatma iki kez gönderilmez — görev iki kez çalıştırıldı:
      1. çalıştırma `sent: 2`, 2. çalıştırma `sent: 0, skipped: 2`
- [x] 375px'te yatay kaydırma yok — sabit genişlikli eleman bulunmuyor
- [x] Oturum açmadan hiçbir sayfaya erişilemez — tümü 307 → `/login`
- [x] `pnpm test` §5.1 tablosundaki beş vaka dahil 26 test geçiyor
- [x] JSON yedek geri yüklendiğinde veri birebir aynı — tur testi `true`

## Geliştirme sırasında bulunup düzeltilen hatalar

1. **Tarih UTC'ye kayıyordu.** `toISOString().slice(0,10)` Europe/Istanbul'da
   (UTC+3) tarihi bir gün geri alıyordu: 16 Eylül → `2026-09-15`. API, kur ve
   iptal tarihi alanlarında `date-fns format` kullanıldı.
   Regresyon testi: `tests/date-format.test.ts`.
2. **Recharts tooltip tip hatası** — derlemeyi kıran formatter imzası düzeltildi.
3. **Turbopack tüm projeyi izliyordu** — SQLite yol çözümüne `turbopackIgnore`.

## 13. İşletim — sistem hâline getirme (19.09.2026)

- `ops/daily.sh`: TCMB kuru → hatırlatma → SQLite `.backup` → 30 gün temizlik;
  gönderilen hatırlatma varsa macOS bildirimi (e-posta anahtarı gerekmez).
- `ops/*.plist` + `install.sh`/`uninstall.sh`: launchd ajanları
  (`server`: RunAtLoad + KeepAlive, port 3000; `daily`: her gün 09:00).
- Doğrulandı: `kill -9` sonrası sunucu launchd tarafından saniyeler içinde geri kaldırıldı;
  günlük görev elle çalıştırıldı, kur çekildi, yedek `integrity_check: ok`.
- Öğrenilen: `pkill -f "next start"` yalnızca ana süreci öldürür, `next-server`
  işçisi PID 1'e yetim kalıp portu tutar → `EADDRINUSE`. Doğru durdurma:
  `launchctl bootout` veya portu dinleyen PID'yi `lsof` ile bulup kapatmak.

## Açık kalanlar (kullanıcı girişi gerekiyor)

- 10 taslak abonelik plan/tutar/tarih bekliyor; hepsi `paused`, doldurulunca "Aktif et".
- 3dai.com ve Tripo `dev` hesabına varsayılan olarak bağlandı — doğrulanmalı.
- E-posta bildirimi için Resend anahtarı; şimdilik yalnızca macOS bildirimi.
- Git: çalışma commit edilmedi (kullanıcı istemedi).
