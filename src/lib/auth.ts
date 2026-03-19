import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(input) {
        const parsed = credentialsSchema.safeParse(input);

        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: { role: true }
        });

        if (!user || !user.isActive) return null;

        const isValidPassword = await compare(parsed.data.password, user.passwordHash);
        if (!isValidPassword) return null;

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          roleCode: user.role.code,
          companyId: user.companyId
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roleCode = (user as { roleCode: string }).roleCode;
        token.companyId = (user as { companyId: string | null }).companyId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.roleCode = token.roleCode as string;
        session.user.companyId = token.companyId as string | null;
      }

      return session;
    }
  }
});
