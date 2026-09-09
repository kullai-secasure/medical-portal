import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// A pre-computed bcrypt hash with no corresponding real password. Comparing
// against this when the account doesn't exist keeps authorize()'s timing
// indistinguishable from the "wrong password" path, closing the user
// enumeration / credential-state oracle (VenusHawk finding #8).
const DUMMY_PASSWORD_HASH = "$2b$10$rDjsFv0Um9J9rWWShCQF6.GXRDloFqMiYyXsDx9h8MQ2Ph2xFmgKG";
const GENERIC_AUTH_ERROR = "Invalid email or password";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error(GENERIC_AUTH_ERROR);
        }

        const user = await getUserByEmail(credentials.email);

        // Always run a bcrypt compare, even for a nonexistent user, so the
        // response time and error message are identical for "no such
        // account", "wrong password", and "disabled account". Only the
        // generic message below is ever thrown back to the client; the
        // specific reason is not exposed.
        const isPasswordValid = await verifyPassword(
          credentials.password,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH
        );

        if (!user || !isPasswordValid || !user.isActive) {
          throw new Error(GENERIC_AUTH_ERROR);
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          image: null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      if (!token.id) {
        return {};
      }

      // Re-validate against the database on every request instead of trusting
      // the claims baked in at sign-in. Without this, disabling a user or
      // changing their role does not take effect until the JWT's 30-day
      // maxAge expires (VenusHawk finding #3).
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { isActive: true, role: true },
      });

      if (!dbUser || !dbUser.isActive) {
        return {};
      }

      token.role = dbUser.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      } else {
        // Token was invalidated by the jwt callback (disabled/deleted user) —
        // return a session with no user so callers treat this as signed out.
        session.user = undefined as unknown as typeof session.user;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
