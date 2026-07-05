import NextAuth, { type DefaultSession } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-server'

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { data: user } = await supabaseAdmin
          .from('profiles')
          .select('*')
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
      // Auto-create profile for Google users on first sign in
      if (account?.provider === 'google' && user.email) {
        const normalizedEmail = user.email.toLowerCase()
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', normalizedEmail)
          .single()

        if (!existing) {
          await supabaseAdmin.from('profiles').insert({
            email: normalizedEmail,
            full_name: user.name,
          })
        }
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
