# Abonelik ve Lisans Takip

artriyum'un dört e-posta hesabına dağılmış AI aboneliklerini ve yazılım
lisanslarını tek panelden takip eder. Teknik doküman: [docs/spec.md](docs/spec.md).

## Çalıştırma

```bash
pnpm install
pnpm db:migrate     # tabloları oluşturur (data/app.db)
pnpm seed           # 4 hesap + 4 kullanıcı + örnek abonelikler
pnpm dev            # http://localhost:3000
```

Giriş bilgileri: `.env` içindeki `SEED_PASSWORD`, kullanıcı adı olarak dört
hesabın e-postasından biri (ör. `dev2.artriyum@gmail.com`).

## Komutlar

| Komut | İş |
|---|---|
| `pnpm dev` | Geliştirme sunucusu |
| `pnpm build` / `pnpm start` | Üretim derlemesi ve sunucu |
| `pnpm test` | Birim testleri (yenilenme + para hesapları) |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Şemadan yeni migration üretir |
| `pnpm db:migrate` | Migration'ları uygular |
| `pnpm seed` | Hesap ve kullanıcıları oluşturur (mevcut veriyi ezmez) |

## Ekranlar

- `/` — panel: zaman şeridi, özet kutuları, hesap filtresi, abonelik listesi
- `/subscriptions/new` — yeni abonelik
- `/subscriptions/[id]` — detay, kota işaretleme, ödeme geçmişi, düzenleme
- `/accounts` — hesaplar ve hesap başına aylık yük
- `/reports` — kategori/hesap dağılımı, 12 aylık ödeme grafiği, CSV
- `/settings` — kur girişi, hatırlatma ayarları, JSON yedek al/geri yükle

## Zamanlanmış görevler

Her iki uç da `CRON_SECRET` başlığı ister:

```bash
curl -X POST localhost:3000/api/cron/reminders -H "x-cron-secret: $CRON_SECRET"
curl -X POST localhost:3000/api/cron/fx       -H "x-cron-secret: $CRON_SECRET"
```

macOS'ta günlük 09:00 için `crontab -e`:

```
0 9 * * * curl -sS -X POST http://localhost:3000/api/cron/reminders -H "x-cron-secret: SIZIN_SECRET"
```

E-posta `EMAIL_PROVIDER=none` iken gönderilmez, yalnızca sunucu günlüğüne yazılır.
Resend kullanmak için `.env` içinde `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` ve
`REMINDER_TO` doldurulur.

## Yedekleme

```bash
cp data/app.db backups/app-$(date +%F).db      # dosya kopyası
# veya panelden: Ayarlar → JSON yedek indir
```

## Notlar

- `anchor_date` hiç değişmez; sonraki yenilenme her görüntülemede yeniden hesaplanır.
- Kur girilmemişse TL toplamı gösterilmez — uydurma varsayılan kur kullanılmaz.
- Claude/ChatGPT kalan kotası API ile okunamaz; kota elle işaretlenir (spec §1.3).

## İşletim (macOS, launchd)

Uygulama iki launchd ajanıyla kendi kendine çalışır; terminal açık tutmak gerekmez.

| Ajan | Ne yapar |
|---|---|
| `com.artriyum.abonelik.server` | `next start` — oturum açılışında başlar, çökerse yeniden kalkar, http://localhost:3000 |
| `com.artriyum.abonelik.daily` | Her sabah 09:00 `ops/daily.sh`: TCMB kuru → hatırlatmalar → yedek |

```bash
ops/install.sh      # kur / güncelle (plist'leri ~/Library/LaunchAgents'a kopyalar)
ops/uninstall.sh    # kaldır — veri ve dosyalara dokunmaz
ops/daily.sh        # günlük görevi elle çalıştır
tail -f logs/daily.log logs/server.log
```

- Hatırlatma çıkınca **macOS bildirimi** gösterilir; e-posta için `.env` içinde `EMAIL_PROVIDER=resend` + anahtar.
- Yedekler `backups/app-YYYY-MM-DD.db` (SQLite `.backup`, WAL-güvenli), 30 günden eskisi silinir.
- Kod değiştikten sonra: `pnpm build && launchctl kickstart -k gui/$(id -u)/com.artriyum.abonelik.server`
- Mac uyuyorsa 09:00 görevi uyanınca çalışır (launchd kaçırılan takvim görevini telafi eder).
