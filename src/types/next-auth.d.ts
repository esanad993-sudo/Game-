// NextAuth type augmentation — adds `role` and `id` to the Session.user
// object so we can reference them as `session.user.id` / `session.user.role`
// without TypeScript complaints.
//
// These fields are populated by the jwt() and session() callbacks in auth.ts.
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
  }
}
