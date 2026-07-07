import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.email && credentials?.password) {
          return { id: "1", name: "Mock User", email: credentials.email }
        }
        return null
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "dummy",
      clientSecret: process.env.GOOGLE_SECRET || "dummy",
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "secret_for_development_only",
})

export { handler as GET, handler as POST }
