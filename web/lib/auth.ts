import NextAuth, { type User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mario@dietlogger.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.DIET_API_KEY || '';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        // Single-user system: Mario. Password = ADMIN_PASSWORD (defaults to DIET_API_KEY)
        const isValidEmail = email === ADMIN_EMAIL.toLowerCase();
        const isValidPassword = ADMIN_PASSWORD && password === ADMIN_PASSWORD;

        if (isValidEmail && isValidPassword) {
          return {
            id: '1',
            email: ADMIN_EMAIL,
            name: 'Mario',
          };
        }

        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 giorni
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
});
