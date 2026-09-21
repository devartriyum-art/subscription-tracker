# v2 — Workspace izolasyonu + bulut dağıtımı

**Hedef:** Panel 7/24 bulutta çalışsın; davet edilen her kişi/ekip yalnızca
kendi aboneliklerini görsün. Kayıt ekranı yok — hesapları elle açıyoruz.

## Neden gerekli

Mevcut sürüm tek ortak veri havuzu kullanıyor (spec §1.3: multi-tenant bilinçli
olarak kapsam dışıydı). İzolasyon olmadan internete açılırsa her kullanıcı
herkesin abonelik tutarlarını görür ve silebilir.

## Veri modeli değişikliği

Yeni tablo `workspaces` (id, name, created_at).
`users.workspace_id` → FK. `accounts.workspace_id` → FK.

Abonelik zaten `account_id` üzerinden hesaba bağlı, hesap da workspace'e bağlanınca
zincir tamamlanıyor: subscription → account → workspace.

## İzolasyon kuralı (tek kural, her yerde aynı)

Her okuma/yazma, oturumdaki kullanıcının `workspace_id`'si ile filtrelenir.
- `getSubscriptionViews`, `getAccounts`, `getSummary`, raporlar → workspace filtresi
- Server Action'larda: kaydın workspace'i oturumunkiyle eşleşmiyorsa **reddet**
- `/api/export`, `/api/reports/csv` → yalnızca kendi workspace'i
- `/api/cron/*` → tüm workspace'ler (sistem görevi, oturum yok)

## Adımlar

1. Şema: `workspaces` tablosu + `workspace_id` alanları, migration
2. Mevcut veriyi taşı: artriyum workspace'i oluştur, dört hesabı ona bağla
3. `auth.ts`: oturuma `workspaceId` ekle
4. `lib/queries.ts`: her sorguya filtre
5. `actions/*`: her yazmada sahiplik doğrulaması
6. **Sızıntı testleri**: iki workspace kur, A'nın B'nin verisine ulaşamadığını kanıtla
7. Turso'ya geçiş: `@libsql/client`, şema aynı
8. Vercel dağıtımı + cron (`vercel.json`)
9. Kullanıcı açma betiği: `pnpm user:add <email> <ad> <workspace>`

## Durum (21.09.2026)

Adım 1-6 **tamam**: workspaces tablosu, veri taşıma, oturumda workspaceId,
sorgu filtreleri, 16 sahiplik doğrulaması, 5 sızıntı testi (31/31 test yeşil).
Canlı doğrulama: ikinci workspace açıldı → liste 0 kayıt, export boş,
başka workspace'in kaydı id ile istendiğinde 404. Sızıntı yok.

Adım 7 **tamam**: libSQL yalnızca async çalışıyor (doğrulandı:
`c.all` undefined, execute Promise döner). 57 senkron çağrı 12 dosyada
await'e çevrildi; seed/add-user betikleri `main()` içine alındı (top-level
await CJS'de çalışmıyor). Dönüşüm sonrası izolasyon yeniden doğrulandı:
yabancı workspace → 0 kayıt, id ile 404, export boş.

Adım 8-9 **hazır**: `vercel.json` + `/api/cron/daily` (kur+hatırlatma tek uçta,
ücretsiz katman 1 cron sınırı), `ops/turso-schema.sql` (temiz veritabanında
doğrulandı), `pnpm user:add`. Dağıtım adımları: DEPLOY.md.

## Kabul kriterleri

- [ ] A workspace'indeki kullanıcı B'nin aboneliklerini göremez (panel, API, CSV, export)
- [ ] A, B'nin kaydını id ile bile düzenleyemez/silemez (doğrudan istek denenir)
- [ ] Mevcut artriyum verisi taşımadan sonra eksiksiz
- [ ] Hatırlatma görevi tüm workspace'ler için çalışır, mailler karışmaz
- [ ] `pnpm test` yeşil, sızıntı testleri dahil
