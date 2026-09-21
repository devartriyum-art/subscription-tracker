import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { SubscriptionForm } from "@/components/subscription-form";
import { getAccounts } from "@/lib/queries";
import { createSubscription } from "@/actions/subscriptions";

export const dynamic = "force-dynamic";

export default async function NewSubscriptionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const workspaceId = session.user.workspaceId;

  const accounts = await getAccounts(workspaceId);

  async function create(formData: FormData) {
    "use server";
    const result = await createSubscription(formData);
    if (result.ok) redirect("/");
    redirect(`/subscriptions/new?error=${encodeURIComponent(result.error)}`);
  }

  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5">
        <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
          ← Panel
        </Link>
        <h1 className="text-lg font-semibold">Yeni abonelik</h1>
        <SubscriptionForm
          accounts={accounts}
          action={create}
          submitLabel="Kaydet"
        />
      </main>
    </>
  );
}
