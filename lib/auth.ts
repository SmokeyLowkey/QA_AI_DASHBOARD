import { PrismaAdapter } from "@auth/prisma-adapter"
import type { NextAuthOptions } from "next-auth"
import type { Adapter } from "next-auth/adapters"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { compare } from "bcrypt"

import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/utils"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }
        
        // Check if user is approved
        if (user.registrationStatus !== "APPROVED") {
          throw new Error("Your account is pending approval");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        // Log successful login
        try {
          await createAuditLog({
            userId: user.id,
            action: "LOGIN",
            resource: "AUTH",
            resourceId: user.id,
            details: { method: "credentials" },
            ipAddress: req?.headers?.["x-forwarded-for"] as string || "unknown",
            userAgent: req?.headers?.["user-agent"] as string || "unknown",
          });
        } catch (error) {
          console.error("Error creating login audit log:", error);
          // Don't throw - audit logs should not block login
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.picture as string;
        session.user.role = token.role;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      
      // If token exists but no user was passed, check if user is still approved
      if (token && !user && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, name: true, email: true, image: true, role: true, registrationStatus: true }
        });
        
        if (dbUser && dbUser.registrationStatus !== "APPROVED") {
          // User's approval status has changed, invalidate the token
          return { ...token, id: "", role: "USER" };
        }
      }
      
      return token;
    },
  },
  events: {
    async signOut({ token }) {
      try {
        if (token.id) {
          // Check if user exists before creating audit log
          const user = await db.user.findUnique({
            where: { id: token.id as string },
          });
          
          if (user) {
            await createAuditLog({
              userId: user.id,
              action: "LOGOUT",
              resource: "AUTH",
              resourceId: user.id,
              details: {},
            });
          }
        }
      } catch (error) {
        console.error("Error creating logout audit log:", error);
        // Don't throw - audit logs should not block sign out
      }
    },
  },
}
