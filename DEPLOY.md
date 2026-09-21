# Vercel + Turso dağıtımı

Kod hazır; aşağıdaki adımlar sizin hesaplarınızda yapılır.

## 1. Turso (veritabanı)

```bash
brew install tursodatabase/tap/turso     # veya: curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup                        # tarayıcı açılır
turso db create abonelik
turso db shell abonelik < ops/turso-schema.sql   # tabloları kurar

turso db show abonelik --url             # TURSO_DATABASE_URL
turso db tokens create abonelik          # TURSO_AUTH_TOKEN
```

## 2. Mevcut veriyi taşıma (isteğe bağlı)

Yereldeki 10 abonelik ve hesaplar buluta taşınsın isterseniz:

```bash
/usr/bin/sqlite3 data/app.db .dump \
  | grep -v -e 'CREATE TABLE' -e 'CREATE INDEX' -e 'sqlite_sequence' -e 'BEGIN' -e 'COMMIT' \
  > /tmp/veri.sql
turso db shell abonelik < /tmp/veri.sql
```

## 3. Vercel (barındırma)

```bash
npm i -g vercel
vercel login
vercel link          # yeni proje oluştur
```

Ortam değişkenleri (Vercel panelinden veya CLI ile, **Production** ortamına):

| Anahtar | Değer |
|---|---|
| `TURSO_DATABASE_URL` | adım 1'deki url (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | adım 1'deki token |
| `AUTH_SECRET` | `openssl rand -base64 32` ile yeni üretin |
| `CRON_SECRET` | `openssl rand -hex 24` ile yeni üretin |
| `EMAIL_PROVIDER` | `none` (veya `resend`) |
| `REMINDER_DAYS` | `7,1` |
| `TZ` | `Europe/Istanbul` |

```bash
vercel --prod
```

`vercel.json` günlük cron'u tanımlar: 06:00 UTC = 09:00 İstanbul, `/api/cron/daily`.
Vercel bu isteğe `Authorization: Bearer $CRON_SECRET` başlığını kendi ekler.

## 4. Kullanıcı açma (buluttayken)

```bash
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... \
  pnpm user:add ahmet@ornek.com "Ahmet Yılmaz" "Ahmet Ekibi"
```

Aynı workspace adı → kişi mevcut ekibe eklenir (veriyi paylaşır).
Farklı ad → yeni izole workspace.

## Dağıtım sonrası kontrol listesi

- [ ] Giriş çalışıyor
- [ ] İki farklı workspace kullanıcısı birbirinin verisini görmüyor
- [ ] `/api/cron/daily` cron secret olmadan 401 veriyor
- [ ] Yerel launchd ajanları kaldırıldı (`ops/uninstall.sh`) — artık gereksiz
