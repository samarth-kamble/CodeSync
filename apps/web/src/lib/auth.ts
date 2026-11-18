import { betterAuth } from 'better-auth';

const baseURL =
  process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const secret = process.env.BETTER_AUTH_SECRET;

export const auth = betterAuth({
  baseURL,
  secret,
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      scope: ['repo'],
    },
  },
});

export type Auth = typeof auth;
