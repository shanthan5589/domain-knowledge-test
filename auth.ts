import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-server'

export const { handlers, signIn, signOut, auth } = NextAuth({
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
          .eq('email', credentials.email)
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
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .single()

        if (!existing) {
          await supabaseAdmin.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.name,
          })
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
