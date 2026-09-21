# Abonelik ve Lisans Takip Uygulaması — Teknik Doküman

**Sürüm:** 1.0
**Hazırlanma tarihi:** 15.09.2026
**Hedef:** artriyum bünyesindeki dört e-posta hesabına dağılmış AI abonelikleri ve yazılım lisanslarının tek panelden takibi
**Geliştirme ortamı:** VS Code + Claude Code, macOS (Apple Silicon)

---

## 1. Problem ve kapsam

### 1.1 Mevcut durum

Şirket dört ayrı e-posta hesabı üzerinden AI ve SaaS aboneliği kullanıyor (design, dev, dev2, management). Hesapların bir kısmı bireysel plan, bir kısmı takım planı; yenilenme tarihleri birbirini tutmuyor. Aynı hesaplarla ChatGPT ve Claude dışında başka araçlara da kayıt olunmuş veya satın alınmış durumda.

Bunun üç sonucu var:

1. Hangi hesapta hangi planın olduğu takip edilemiyor, mükerrer abonelik riski var.
2. Yenilenme tarihleri sürpriz oluyor; iptal penceresi kaçıyor.
3. Toplam aylık AI/yazılım gideri hiçbir yerde tek sayı olarak görünmüyor.

### 1.2 Uygulamanın yapacağı işler

- Her aboneliği hesap, plan, tutar, para birimi ve döngü bilgisiyle kaydetmek
- Bir sonraki yenilenme tarihini döngüye göre **otomatik ileri taşımak** (elle güncelleme gerektirmemek)
- Yaklaşan yenilenmeleri zaman çizgisi üzerinde göstermek ve e-posta ile hatırlatmak
- Aylık ve yıllık toplam gideri para birimi bazında ve TL karşılığıyla raporlamak
- Kullanım/kota durumunu **elle işaretlenen** anlık kayıtlar olarak tutmak ve geçmişini göstermek
- Geçmiş ödemeleri kaydedip yıllık gider raporu çıkarmak

### 1.3 Kapsam dışı (bilinçli kararlar)

| Konu | Karar | Gerekçe |
|---|---|---|
| Claude/ChatGPT kalan session sayısının otomatik okunması | **Yapılmayacak** | Anthropic ve OpenAI abonelik kotasını dışarıya API ile açmıyor. Hiçbir üçüncü taraf araç bunu okuyamaz. Kullanım verisi elle işaretlenir. |
| Kredi kartı ekstresinden otomatik eşleştirme | v1'de yok | Banka entegrasyonu ayrı bir proje; v2'de CSV içe aktarma olarak değerlendirilir. |
| Otomatik iptal/satın alma | Yok | Hiçbir servis bunu API ile vermiyor; panel yalnızca bilgilendirir. |
| Çok şirketli (multi-tenant) yapı | Yok | Tek şirket, dört kullanıcı. Gereksiz karmaşıklık. |

**Not:** API kullanımının (abonelik değil, API anahtarı harcaması) otomatik takibi mümkündür — Anthropic Console'un usage/cost endpoint'i bunu verir. Bu, v2 için ayrı bir modül olarak planlanmıştır (bkz. §12).

---

## 2. Kullanıcılar ve senaryolar

Dört kullanıcı, hepsi aynı veriyi görür ve düzenleyebilir. Rol ayrımı yok — küçük ekipte yönetim maliyeti getirir.

**Senaryo A — Sabah kontrolü.** Kullanıcı paneli açar, "önümüzdeki 30 gün" şeridinde üç yenilenme görür, birinin iptal edilmesi gerektiğini fark eder, aboneliği pasife alır.

**Senaryo B — Yeni araç alımı.** Bir araç satın alınır. Kullanıcı 30 saniyede kaydı girer: servis adı, hangi hesapla alındı, tutar, döngü, ilk ödeme tarihi.

**Senaryo C — Kota işaretleme.** Claude'da limit dolduğunda kullanıcı ilgili aboneliğin kota kaydırıcısını %100'e çeker, not düşer. Sonraki ay aynı hesabın haftalık ne sıklıkla limite dayandığı geçmişten görülür ve plan yükseltme kararı buna dayanır.

**Senaryo D — Bütçe sorusu.** "AI'a ayda ne veriyoruz?" sorusuna panelin üst şeridi tek sayıyla cevap verir.

---

## 3. Teknoloji kararları

| Katman | Seçim | Gerekçe |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Tek kod tabanında hem arayüz hem API. Server Actions sayesinde ayrı bir backend'e gerek yok. |
| Stil | **Tailwind CSS v4** | Hızlı ve mobil uyumlu. Tema değişkenleri `globals.css` içinde CSS custom property olarak tanımlanır. |
| Veritabanı | **SQLite** (dosya tabanlı), `better-sqlite3` sürücüsü | Dört kullanıcı ve birkaç yüz kayıt için fazlasıyla yeterli. Yedekleme tek dosya kopyalamak demek. Postgres'e geçiş gerekirse ORM sayesinde şema değişmeden taşınır. |
| ORM | **Drizzle ORM** | Tip güvenli, migration'ları SQL olarak üretir, Prisma'ya göre çok daha hafif. |
| Kimlik doğrulama | **Auth.js v5**, credentials provider | Dört kullanıcı elle seed edilir; harici OAuth sağlayıcıya bağımlılık yaratmaz. |
| Zamanlanmış görev | `node-cron` (self-host) veya Vercel Cron | Günlük hatırlatma e-postası için. |
| E-posta | **Resend** | Basit API, günlük 100 mail ücretsiz. `EMAIL_PROVIDER=none` ile tamamen kapatılabilir. |
| Tarih işlemleri | **date-fns** + `date-fns-tz` | Ay sonu taşma mantığı elle yazılmaz. Tüm hesaplar `Europe/Istanbul` zaman diliminde. |
| Grafik | **Recharts** | Aylık gider trendi için tek grafik yeterli; ağır bir kütüphane gerekmiyor. |

**Alternatif değerlendirmesi:** Supabase + Postgres da uygundu, ancak dışarıya bağımlılık ve ücretsiz katman sınırları getiriyor. SQLite ile uygulama tek bir Docker konteynerinde veya doğrudan Mac'te çalışır. Eğer ileride dışarıdan (ofis dışı) erişim şart olursa Postgres'e geçiş bir migration dosyası meselesidir.

---

## 4. Veri modeli

### 4.1 Tablolar

**`users`** — panele girebilecek kişiler
| Alan | Tip | Açıklama |
|---|---|---|
| id | text (uuid) | PK |
| email | text unique | giriş e-postası |
| name | text | görünen ad |
| password_hash | text | bcrypt |
| created_at | integer (unix) | |

**`accounts`** — abonelikleri barındıran e-posta hesapları (design, dev, dev2, management)
| Alan | Tip | Açıklama |
|---|---|---|
| id | text (uuid) | PK |
| label | text | kısa etiket, ör. "design" |
| email | text | hesabın e-postası |
| color | text | hex renk, arayüzde hesap ayrımı için |
| note | text nullable | ör. ödeme kartı bilgisi |
| archived | integer (0/1) | |

**`subscriptions`** — asıl kayıt
| Alan | Tip | Açıklama |
|---|---|---|
| id | text (uuid) | PK |
| account_id | text | FK → accounts.id |
| service | text | "Claude", "ChatGPT", "Figma" |
| plan | text nullable | "Max 20x", "Plus", "Team" |
| category | text | enum: `ai`, `design`, `dev`, `office`, `other` |
| amount | real | dönem başına tutar |
| currency | text | enum: `TRY`, `USD`, `EUR` |
| cycle | text | enum: `monthly`, `quarterly`, `yearly`, `once` |
| anchor_date | text (YYYY-MM-DD) | ilk ödeme / referans yenilenme tarihi. **Bu alan hiç değişmez**, sonraki tarihler bundan hesaplanır. |
| auto_renew | integer (0/1) | |
| seats | integer default 1 | koltuk sayısı (takım planları için) |
| url | text nullable | fatura/hesap sayfası linki |
| note | text nullable | |
| status | text | enum: `active`, `paused`, `cancelled` |
| cancelled_at | text nullable | |
| created_at / updated_at | integer | |

**`usage_snapshots`** — elle işaretlenen kota durumu (geçmiş tutulur, tek alan üzerine yazılmaz)
| Alan | Tip | Açıklama |
|---|---|---|
| id | text | PK |
| subscription_id | text | FK |
| percent | integer 0–100 | |
| label | text nullable | "5 saatlik pencere", "haftalık kota" |
| note | text nullable | |
| recorded_by | text | FK → users.id |
| recorded_at | integer | |

**`payments`** — gerçekleşen ödemeler (gider raporu için)
| Alan | Tip | Açıklama |
|---|---|---|
| id | text | PK |
| subscription_id | text | FK |
| amount | real | |
| currency | text | |
| paid_on | text (YYYY-MM-DD) | |
| fx_rate_try | real nullable | ödeme anındaki TL kuru |
| note | text nullable | |

**`fx_rates`** — kur tablosu
| Alan | Tip | Açıklama |
|---|---|---|
| currency | text | PK ile birlikte |
| date | text (YYYY-MM-DD) | PK |
| rate_try | real | 1 birim = kaç TL |
| source | text | `manual` veya `tcmb` |

**`reminder_log`** — aynı hatırlatmanın iki kez gitmesini engeller
| Alan | Tip |
|---|---|
| id | text |
| subscription_id | text |
| due_date | text |
| days_before | integer |
| sent_at | integer |

### 4.2 Drizzle şema örneği

```ts
// src/db/schema.ts
import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  email: text("email").notNull(),
  color: text("color").notNull().default("#2F6FED"),
  note: text("note"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  service: text("service").notNull(),
  plan: text("plan"),
  category: text("category", { enum: ["ai", "design", "dev", "office", "other"] })
    .notNull().default("other"),
  amount: real("amount").notNull().default(0),
  currency: text("currency", { enum: ["TRY", "USD", "EUR"] }).notNull().default("TRY"),
  cycle: text("cycle", { enum: ["monthly", "quarterly", "yearly", "once"] })
    .notNull().default("monthly"),
  anchorDate: text("anchor_date").notNull(),          // YYYY-MM-DD
  autoRenew: integer("auto_renew", { mode: "boolean" }).notNull().default(true),
  seats: integer("seats").notNull().default(1),
  url: text("url"),
  note: text("note"),
  status: text("status", { enum: ["active", "paused", "cancelled"] })
    .notNull().default("active"),
  cancelledAt: text("cancelled_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const fxRates = sqliteTable("fx_rates", {
  currency: text("currency").notNull(),
  date: text("date").notNull(),
  rateTry: real("rate_try").notNull(),
  source: text("source", { enum: ["manual", "tcmb"] }).notNull().default("manual"),
}, (t) => ({ pk: primaryKey({ columns: [t.currency, t.date] }) }));
```

---

## 5. İş kuralları

Bu bölüm uygulamanın kalbidir; saf fonksiyon olarak yazılmalı ve birim testleri buraya odaklanmalıdır.

### 5.1 Sonraki yenilenme tarihi

`anchor_date` asla değiştirilmez. Görüntülenen tarih her seferinde yeniden hesaplanır:

```ts
// src/lib/renewal.ts
import { addMonths, isBefore, lastDayOfMonth, setDate, startOfDay } from "date-fns";

const STEP = { monthly: 1, quarterly: 3, yearly: 12, once: 0 } as const;

/** anchor'dan başlayıp bugüne veya sonrasına düşen ilk tarihi döndürür. */
export function nextRenewal(anchorISO: string, cycle: keyof typeof STEP, today = new Date()): Date {
  const anchor = startOfDay(new Date(anchorISO));
  const step = STEP[cycle];
  if (step === 0) return anchor;              // tek seferlik: hiç ilerlemez

  const anchorDay = anchor.getDate();
  let d = anchor;
  let guard = 0;
  while (isBefore(d, startOfDay(today)) && guard++ < 1200) {
    d = addMonths(d, step);
    // 31 Ocak + 1 ay = 28/29 Şubat olmalı, sonraki ayda tekrar 31'e dönmeli
    const maxDay = lastDayOfMonth(d).getDate();
    d = setDate(d, Math.min(anchorDay, maxDay));
  }
  return d;
}
```

**Kritik davranış:** ay sonu taşması. Anchor 31 Ocak ise, Şubat'ta 28'e düşer ama Mart'ta yine 31 olur — `addMonths` sonrası her adımda `anchorDay`'e geri sabitlenerek sağlanır. `date-fns`'in `addMonths` fonksiyonu tek başına bunu yapmaz (31 Ocak → 28 Şubat → 28 Mart üretir), bu yüzden yukarıdaki düzeltme şart.

**Test vakaları:**
| anchor | cycle | bugün | beklenen |
|---|---|---|---|
| 2026-01-31 | monthly | 2026-02-15 | 2026-02-28 |
| 2026-01-31 | monthly | 2026-03-01 | 2026-03-31 |
| 2024-02-29 | yearly | 2026-01-01 | 2026-02-28 |
| 2026-10-05 | monthly | 2026-09-15 | 2026-10-05 (gelecekteyse ilerletme) |
| 2026-03-01 | once | 2026-09-15 | 2026-03-01 (geçmişte kalır) |

### 5.2 Aylık eşdeğer maliyet

```
monthly   → amount
quarterly → amount / 3
yearly    → amount / 12
once      → 0   (tekrar eden gidere dahil edilmez)
```

Yalnızca `status = 'active'` kayıtlar toplanır. Toplamlar önce para birimi bazında ayrı ayrı hesaplanır, sonra kur uygulanarak tek TL rakamına indirilir.

### 5.3 Kur

- `fx_rates` tablosundaki **en güncel tarihli** kayıt kullanılır.
- Kur elle girilebilir. Opsiyonel olarak TCMB'nin günlük XML servisinden (`https://www.tcmb.gov.tr/kurlar/today.xml`) çekilir; anahtar gerektirmez, `ForexSelling` alanı okunur. Hafta sonu/tatilde servis bir önceki iş gününü verir, hata olarak ele alınmaz.
- Kur yoksa TL toplamı gösterilmez; "kur girilmedi" durumu arayüzde açıkça yazılır. Uydurma varsayılan kur **kullanılmaz**.

### 5.4 Durum sınıfları

`daysLeft = nextRenewal - bugün` (gün)

| Aralık | Sınıf | Arayüz |
|---|---|---|
| < 0 | `overdue` | yalnızca `once` döngüde mümkün; gri |
| 0–3 | `critical` | kırmızı |
| 4–10 | `soon` | amber |
| > 10 | `normal` | nötr |

`auto_renew = false` olan kayıtlar kritik aralıkta ayrıca "elle yenilenmeli" rozeti alır.

### 5.5 Hatırlatma

Günlük 09:00 (Europe/Istanbul) çalışan görev, yenilenmesine **7 gün** ve **1 gün** kalan aktif abonelikleri bulur, `reminder_log` içinde aynı (subscription_id, due_date, days_before) üçlüsü yoksa e-posta gönderir ve loglar. Eşik değerleri `.env` ile değiştirilebilir (`REMINDER_DAYS=7,1`).

---

## 6. API yüzeyi

Veri değiştiren işlemler **Server Actions** ile yapılır; okuma işlemleri sunucu bileşenlerinde doğrudan sorgulanır. Aşağıdaki Route Handler'lar yalnızca dışarıdan erişim gereken uçlar için açılır.

| Metot | Yol | İş |
|---|---|---|
| GET | `/api/subscriptions` | JSON liste (yedek/dışa aktarma için) |
| POST | `/api/cron/reminders` | hatırlatma görevini tetikler, `CRON_SECRET` header'ı ister |
| POST | `/api/cron/fx` | TCMB kurunu çeker |
| GET | `/api/export` | tüm veriyi JSON olarak indirir |

Server Actions:

```
createSubscription(input)       updateSubscription(id, input)
setSubscriptionStatus(id, s)    deleteSubscription(id)
recordUsage(subscriptionId, percent, label?, note?)
recordPayment(subscriptionId, amount, currency, paidOn, fxRate?)
upsertAccount(input)            setFxRate(currency, rate)
```

Tüm giriş doğrulaması **Zod** şemalarıyla yapılır ve şemalar hem formda hem action'da paylaşılır.

---

## 7. Ekranlar

Mobil öncelikli tasarlanır — kontroller telefondan yapılacak. Tüm liste satırları 640px altında tek sütuna iner.

### 7.1 `/` — Panel

Yukarıdan aşağıya:

1. **Zaman şeridi (60 gün).** Yatay eksen; her yenilenme, hesabın rengiyle bir nokta. En yakın üç kayıt etiketli. Mobilde şerit 30 güne düşer.
2. **Özet kutuları.** Aylık yük (para birimi başına ayrı + TL toplamı), 30 günde çıkacak nakit, aktif abonelik sayısı, kritik durumdaki kayıt sayısı.
3. **Hesap filtresi.** Renk noktalı yuvarlak düğmeler; "Tümü" dahil.
4. **Abonelik listesi.** Yenilenmeye kalan güne göre sıralı. Her satır: servis + plan, hesap etiketi ve e-postası, kalan gün ve tarih, tutar/döngü, son kota işareti (varsa mini çubuk), düzenle/pasife al/sil.

### 7.2 `/subscriptions/[id]` — Detay

Aboneliğin tüm alanları, kota geçmişi (tarih + yüzde listesi ve küçük bir çizgi grafik), ödeme geçmişi, hızlı kota işaretleme kaydırıcısı.

### 7.3 `/accounts` — Hesaplar

Dört hesabın etiketi, e-postası, rengi ve notu. Hesap başına toplam aylık yük ve abonelik sayısı burada gösterilir.

### 7.4 `/reports` — Raporlar

- Kategori bazında aylık dağılım (ai / design / dev / office / other)
- Hesap bazında aylık dağılım
- Son 12 ayın gerçekleşen ödeme toplamı (Recharts çizgi grafik)
- CSV dışa aktarma

### 7.5 `/settings` — Ayarlar

Kur girişi ve TCMB'den çekme düğmesi, hatırlatma eşikleri, e-posta alıcıları, JSON yedek al / geri yükle.

### 7.6 Tasarım kuralları

- Tek yazı ailesi, tabular rakamlar (`font-variant-numeric: tabular-nums`) — tutarlar alt alta hizalı dursun.
- Hesap rengi yalnızca **bilgi taşıdığı yerde** kullanılır: satırın sol kenarı, şerit noktası, filtre düğmesi. Dekoratif renk yok.
- Boş durum ekranları ne yapılacağını söyler: "Henüz kayıt yok. İlk aboneliği ekle — hesap, tutar ve bir sonraki yenilenme tarihi yeterli."
- Klavye odağı görünür, `prefers-reduced-motion` desteklenir.

---

## 8. Kimlik doğrulama ve güvenlik

- Auth.js v5, credentials provider, bcrypt ile hash'lenmiş parola.
- Kullanıcılar `pnpm seed` ile oluşturulur; kayıt (sign-up) ekranı **yoktur**.
- Tüm sayfalar middleware ile korunur; `/api/cron/*` uçları oturum yerine `CRON_SECRET` başlığı ile doğrulanır.
- Veritabanı dosyası repoya girmez (`.gitignore`), `.env` de öyle.
- Abonelik notlarına kart numarası yazılmaz — bunun yerine "son 4 hane" yeterlidir; form ipucu metninde bu belirtilir.

---

## 9. Proje yapısı

```
abonelik/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/page.tsx
│  │  ├─ page.tsx                    # panel
│  │  ├─ subscriptions/[id]/page.tsx
│  │  ├─ accounts/page.tsx
│  │  ├─ reports/page.tsx
│  │  ├─ settings/page.tsx
│  │  └─ api/{export,cron}/…
│  ├─ components/
│  │  ├─ renewal-timeline.tsx
│  │  ├─ subscription-row.tsx
│  │  ├─ subscription-form.tsx
│  │  ├─ usage-slider.tsx
│  │  └─ summary-cards.tsx
│  ├─ db/{index.ts,schema.ts,seed.ts}
│  ├─ lib/
│  │  ├─ renewal.ts        # §5.1
│  │  ├─ money.ts          # §5.2–5.3
│  │  ├─ fx-tcmb.ts
│  │  ├─ reminders.ts
│  │  └─ validation.ts     # Zod şemaları
│  └─ actions/*.ts
├─ drizzle/                # migration dosyaları
├─ data/app.db             # SQLite (gitignore)
└─ tests/renewal.test.ts
```

---

## 10. Kurulum ve çalıştırma

```bash
pnpm install
cp .env.example .env            # değerleri doldur
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
pnpm seed                        # 4 hesap + kullanıcılar
pnpm dev                         # http://localhost:3000
pnpm test                        # renewal testleri
```

`.env` anahtarları:

```
DATABASE_URL=file:./data/app.db
AUTH_SECRET=
CRON_SECRET=
EMAIL_PROVIDER=resend            # veya none
RESEND_API_KEY=
REMINDER_TO=management@…,design@…
REMINDER_DAYS=7,1
TZ=Europe/Istanbul
```

---

## 11. Dağıtım

**Öneri:** ofisteki bir Mac mini veya küçük bir VPS üzerinde Docker ile. `Dockerfile` Node 22 alpine tabanlı, `data/` dizini volume olarak bağlanır. Cron için konteyner içinde `node-cron`, dışarıdan tetikleme gerekirse `/api/cron/reminders`.

**Alternatif:** Vercel + Turso (SQLite'ın hosted hâli). Bu durumda `better-sqlite3` yerine `@libsql/client` sürücüsüne geçilir — Drizzle şeması aynı kalır. Vercel Cron `vercel.json` ile tanımlanır.

**Yedekleme:** günlük `cp data/app.db backups/app-$(date +%F).db` ve haftalık JSON export. SQLite tek dosya olduğu için yedek stratejisi bu kadar basittir.

---

## 12. Yol haritası

**v1 (bu doküman):** CRUD, otomatik tarih hesabı, panel, hesaplar, kota işaretleme, e-posta hatırlatma, JSON yedek.

**v1.1:** Raporlar sayfası, ödeme geçmişi, CSV dışa aktarma, TCMB kur çekme.

**v2 — API maliyet modülü:** Anthropic Console usage/cost endpoint'i ile API anahtarı bazında gerçek token harcamasını çekmek. Bu, abonelik kotasından farklı ve **otomatikleştirilebilir** olan tek kullanım verisidir. Aynı şekilde OpenAI'ın usage endpoint'i eklenebilir. Endpoint yolları ve yanıt şemaları geliştirme anında dokümantasyondan doğrulanmalı — ezberden yazılmamalı.

**v2.1:** Banka/kart ekstresi CSV içe aktarma ve abonelikle otomatik eşleştirme.

---

## 13. Kabul kriterleri

- [ ] Yenilenme tarihi hiçbir zaman geçmişte görünmez (tek seferlik kayıtlar hariç)
- [ ] 31'inde başlayan aylık abonelik Şubat'ta 28'e düşer, Mart'ta 31'e döner
- [ ] Yıllık abonelik aylık toplama 1/12 oranında yansır
- [ ] Kur girilmediğinde TL toplamı yerine açıklayıcı bir uyarı görünür, uydurma kur kullanılmaz
- [ ] Aynı hatırlatma aynı dönem için iki kez gönderilmez
- [ ] 375px genişlikte tüm ekranlar yatay kaydırma olmadan kullanılabilir
- [ ] Oturum açmadan hiçbir sayfaya erişilemez
- [ ] `pnpm test` içinde §5.1 tablosundaki beş vaka geçer
- [ ] JSON yedek alınıp geri yüklendiğinde veri birebir aynı olur
