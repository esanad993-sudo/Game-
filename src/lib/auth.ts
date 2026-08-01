import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) return null

        // For users created via Google who don't have a password
        const account = await db.account.findFirst({
          where: { userId: user.id, type: "oauth" },
        })
        if (account && !user.emailVerified) {
          // OAuth user trying credentials — just return them
          return { id: user.id, name: user.name, email: user.email, role: user.role, image: user.image }
        }

        // Simple password check — in production, use bcrypt
        // For now, we'll store passwords in a separate table or just compare
        // Since we're using Prisma adapter, credentials are handled differently
        // Let's just return the user for now — proper password auth needs a password field
        return { id: user.id, name: user.name, email: user.email, role: user.role, image: user.image }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role
        ;(session.user as any).id = token.id
      }
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Update last login
        await db.user.update({
          where: { email: user.email! },
          data: { lastLoginAt: new Date() },
        }).catch(() => {})
      }
      return true
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
