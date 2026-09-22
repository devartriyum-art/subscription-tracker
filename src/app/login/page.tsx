import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (session?.user) redirect(params.next ?? "/");

  async function login(formData: FormData) {
    "use server";
    const next = (formData.get("next") as string) || "/";

    // signIn kendi yönlendirmesini yapar ve bunu bir hata fırlatarak
    // bildirir. AuthError dışındaki her şey (yönlendirme sinyali dahil)
    // olduğu gibi yukarı geçmeli — yutulursa istek 500 olur.
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: next,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
      }
      throw error;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-xl font-semibold">Abonelik Takip</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Devam etmek için giriş yapın.
      </p>

      {params.error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-[var(--critical)] px-3 py-2 text-sm text-[var(--critical)]"
        >
          E-posta veya parola hatalı.
        </p>
      ) : null}

      <form action={login} className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="next" value={params.next ?? "/"} />
        <label className="text-sm">
          E-posta
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Parola
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-lg bg-[var(--accent)] px-3 py-2 font-medium text-white"
        >
          Giriş yap
        </button>
      </form>
    </main>
  );
}
