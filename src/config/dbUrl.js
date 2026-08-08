/**
 * Resolve Postgres connection strings from Supabase / Vercel env vars.
 *
 * Preferred (Vercel Supabase integration):
 *   POSTGRES_URL              — pooled (runtime)
 *   POSTGRES_URL_NON_POOLING  — direct (migrations / scripts)
 *   POSTGRES_PRISMA_URL       — prisma/pgbouncer variant
 *   POSTGRES_USER / HOST / PASSWORD / DATABASE — parts
 *
 * Fallback: DATABASE_URL
 */

function stripQuotes(value = '') {
  return String(value).trim().replace(/^["']|["']$/g, '');
}

function buildFromParts() {
  const user = stripQuotes(process.env.POSTGRES_USER);
  const password = stripQuotes(process.env.POSTGRES_PASSWORD);
  const host = stripQuotes(process.env.POSTGRES_HOST);
  const database = stripQuotes(process.env.POSTGRES_DATABASE) || 'postgres';
  if (!user || !password || !host) return null;
  const encoded = encodeURIComponent(password);
  return `postgresql://${user}:${encoded}@${host}:5432/${database}?sslmode=require`;
}

function withSslMode(url) {
  if (!url) return url;
  if (/[?&]sslmode=/.test(url)) return url;
  return url.includes('?') ? `${url}&sslmode=require` : `${url}?sslmode=require`;
}

/** Runtime app connection (prefer pooled URL on Vercel). */
export function resolveDatabaseUrl() {
  const candidates = [
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DATABASE_URL,
    buildFromParts(),
  ];
  const url = candidates.map(stripQuotes).find(Boolean);
  if (!url) {
    return 'postgresql://postgres:postgres@localhost:5432/postgres';
  }
  return withSslMode(url);
}

/** Direct connection for migrate/seed (avoid pgbouncer transaction pooling). */
export function resolveDirectDatabaseUrl() {
  const candidates = [
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    buildFromParts(),
  ];
  const url = candidates.map(stripQuotes).find(Boolean);
  if (!url) {
    return 'postgresql://postgres:postgres@localhost:5432/postgres';
  }
  return withSslMode(url);
}

export function isManagedPostgres(url = '') {
  return /supabase\.co|pooler\.supabase|neon\.tech|amazonaws\.com/i.test(url);
}

export function needsSsl(url = '') {
  return (
    isManagedPostgres(url) ||
    process.env.NODE_ENV === 'production' ||
    /sslmode=require/i.test(url)
  );
}
