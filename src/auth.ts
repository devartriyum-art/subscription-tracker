import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { loginSchema } from "@/lib/validation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Parola", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .get();

        if (!user) return null;
        if (!bcrypt.compareSync(password, user.passwordHash)) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          workspaceId: user.workspaceId,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user?.id) token.sub = user.id;
      // Workspace oturum boyunca taşınır; her sorgu buna göre filtrelenir.
      if (user && "workspaceId" in user) token.workspaceId = user.workspaceId;
      return token;
    },
    session: ({ session, token }) => {
      if (token.sub) session.user.id = token.sub;
      if (token.workspaceId) session.user.workspaceId = token.workspaceId as string;
      return session;
    },
  },
});

/** Server Action'larda oturum zorunluluğu — kullanıcı id'si döner. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Oturum gerekli");
  return id;
}

/** Oturumdaki kullanıcı ve workspace'i birlikte döner. */
export async function requireSession(): Promise<{
  userId: string;
  workspaceId: string;
}> {
  const session = await auth();
  const userId = session?.user?.id;
  const workspaceId = session?.user?.workspaceId;
  if (!userId || !workspaceId) throw new Error("Oturum gerekli");
  return { userId, workspaceId };
}
