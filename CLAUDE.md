# CLAUDE.md

## Referans

Teknik doküman `docs/spec.md` dosyasındadır. **Çelişki durumunda spec'e uyulur.**
Spec'ten sapma gerekiyorsa önce sorulur; yapılan sapmalar `PLAN.md` içinde tabloya yazılır.

## Kod stili

- Arayüz metinleri **Türkçe**, kod ve değişken isimleri **İngilizce**.
- İş kuralları (`src/lib/renewal.ts`, `src/lib/money.ts`) **saf fonksiyon** olarak
  yazılır — veritabanına veya `Date.now()`'a doğrudan bağlanmaz, `today` parametre olarak geçilir.
- Tarih aritmetiği elle yapılmaz, `date-fns` kullanılır.
- Giriş doğrulaması **Zod** ile; şema hem formda hem Server Action'da paylaşılır.
- Para birimi tutarları `real`, tarihler `YYYY-MM-DD` metin, zaman damgaları unix `integer`.

## Her değişiklikten sonra

```bash
pnpm test     # vitest
pnpm lint     # eslint
```

Bu ikisi geçmeden adım "bitti" sayılmaz.

## Dikkat

- `anchor_date` **asla** güncellenmez; sonraki yenilenme her seferinde ondan hesaplanır.
- Kur yoksa TL toplamı gösterilmez — uydurma varsayılan kur kullanılmaz.
- `data/app.db` ve `.env` repoya girmez.
