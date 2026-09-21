import { z } from "zod";

export const CYCLES = ["monthly", "quarterly", "yearly", "once"] as const;
export const CURRENCY_VALUES = ["TRY", "USD", "EUR"] as const;
export const CATEGORIES = ["ai", "design", "dev", "office", "other"] as const;
export const STATUSES = ["active", "paused", "cancelled"] as const;

export const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  ai: "AI",
  design: "Tasarım",
  dev: "Geliştirme",
  office: "Ofis",
  other: "Diğer",
};

export const STATUS_TEXT: Record<(typeof STATUSES)[number], string> = {
  active: "Aktif",
  paused: "Pasif",
  cancelled: "İptal",
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG biçiminde olmalı");

const optionalText = z
  .string()
  .trim()
  .max(500, "En fazla 500 karakter")
  .optional()
  .transform((v) => (v ? v : undefined));

export const subscriptionSchema = z.object({
  accountId: z.string().min(1, "Hesap seçilmeli"),
  service: z.string().trim().min(1, "Servis adı gerekli").max(100),
  plan: optionalText,
  category: z.enum(CATEGORIES).default("other"),
  amount: z.coerce
    .number()
    .min(0, "Tutar negatif olamaz")
    .max(10_000_000, "Tutar çok büyük"),
  currency: z.enum(CURRENCY_VALUES).default("TRY"),
  cycle: z.enum(CYCLES).default("monthly"),
  anchorDate: isoDate,
  autoRenew: z.coerce.boolean().default(true),
  seats: z.coerce.number().int().min(1, "En az 1 koltuk").max(1000).default(1),
  url: z
    .union([z.string().trim().url("Geçerli bir adres girin"), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  note: optionalText,
  status: z.enum(STATUSES).default("active"),
});

export type SubscriptionInput = z.input<typeof subscriptionSchema>;
export type SubscriptionValues = z.output<typeof subscriptionSchema>;

export const accountSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, "Etiket gerekli").max(50),
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Renk #RRGGBB biçiminde olmalı")
    .default("#2F6FED"),
  note: optionalText,
  archived: z.coerce.boolean().default(false),
});

export const usageSchema = z.object({
  subscriptionId: z.string().min(1),
  percent: z.coerce.number().int().min(0).max(100),
  label: optionalText,
  note: optionalText,
});

export const paymentSchema = z.object({
  subscriptionId: z.string().min(1),
  amount: z.coerce.number().min(0),
  currency: z.enum(CURRENCY_VALUES),
  paidOn: isoDate,
  fxRateTry: z.coerce.number().positive().optional(),
  note: optionalText,
});

export const fxRateSchema = z.object({
  currency: z.enum(CURRENCY_VALUES),
  rateTry: z.coerce.number().positive("Kur sıfırdan büyük olmalı"),
  date: isoDate.optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Parola gerekli"),
});
