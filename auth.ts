import NextAuth, { type DefaultSession } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-server'
import { isRateLimited } from '@/lib/rate-limit'

// A production self-host must use AUTH_URL/NEXTAUTH_URL and reject arbitrary
// Host headers. Vercel's edge supplies a verified deployment host, including
// preview URLs, so it is the one production environment where host trust is
// required for OAuth callbacks.
const trustHost = process.env.NODE_ENV !== 'production' || process.env.VERCEL === '1'

// Extend the built-in session/token types so TypeScript knows about our custom fields
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      profileCompleted: boolean
    } & DefaultSession['user']
  }
}


export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          if (await isRateLimited(request, 'credentials-login', 10, 900)) return null
        } catch {
          return null
        }

        // Only the columns the password check and returned session need —
        // pulling the full profile row (country, city, LinkedIn, YOE, …) on
        // every login is wasted bandwidth per credentials sign-in.
        const { data: user } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name, password_hash')
          .eq('email', (credentials.email as string).toLowerCase())
          .single()

        if (!user || !user.password_hash) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        )

        if (!valid) return null

        return { id: user.id, email: user.email, name: user.full_name }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Auto-create profile for Google users on first sign in. Single upsert
      // (ignoreDuplicates on the email unique constraint) instead of
      // select-then-maybe-insert — one round trip for every Google login
      // instead of two on the returning-user hot path.
      if (account?.provider === 'google' && user.email) {
        await supabaseAdmin
          .from('profiles')
          .upsert(
            { email: user.email.toLowerCase(), full_name: user.name },
            { onConflict: 'email', ignoreDuplicates: true }
          )
      }
      return true
    },

    // Runs on sign-in and when update() is called from the client.
    // We store profile_completed in the token so middleware can check it
    // without hitting the DB on every request.
    async jwt({ token, trigger }) {
      if (trigger === 'signIn' || trigger === 'update') {
        const { data } = await supabaseAdmin
          .from('profiles')
          .select('profile_completed')
          .eq('email', (token.email as string).toLowerCase())
          .single()
        token.profileCompleted = data?.profile_completed ?? false
      }
      return token
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.profileCompleted = (token.profileCompleted as boolean) ?? false
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
