import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      unitId: string | null;
      unitCode: string | null;
      unitName: string | null;
    } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { unit: true },
        });

        if (!user || !user.isActive) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          unitId: user.unitId,
          unitCode: user.unit?.code ?? null,
          unitName: user.unit?.name ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        const u = user as any;
        token.id = u.id;
        token.role = u.role;
        token.unitId = u.unitId;
        token.unitCode = u.unitCode;
        token.unitName = u.unitName;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.unitId = (token.unitId as string) ?? null;
        session.user.unitCode = (token.unitCode as string) ?? null;
        session.user.unitName = (token.unitName as string) ?? null;
      }
      return session;
    },
  },
});
