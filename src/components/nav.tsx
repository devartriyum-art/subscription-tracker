import Link from "next/link";
import { signOut } from "@/auth";

const LINKS = [
  { href: "/", label: "Panel" },
  { href: "/accounts", label: "Hesaplar" },
  { href: "/reports", label: "Raporlar" },
  { href: "/settings", label: "Ayarlar" },
];

export function Nav() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className="font-semibold">Abonelik Takip</span>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[var(--muted)] hover:text-[var(--text)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <form
          className="ml-auto"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            Çıkış
          </button>
        </form>
      </div>
    </header>
  );
}
