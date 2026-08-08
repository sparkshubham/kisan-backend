/**
 * Resolve Postgres connection strings from Supabase / Vercel env vars.
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
  return `postgresql://${user}:${encoded}@${host}:5432/${database}`;
}

/** Remove sslmode from URL so pg does not enable cert verification via the query string. */
export function stripSslMode(url) {
  if (!url) return url;
  return url
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/[?&]$/, '')
    .replace(/\?&/, '?')
    .replace(/&&+/g, '&');
}

function firstUrl(candidates) {
  return candidates.map(stripQuotes).find(Boolean) || null;
}

/** Runtime app connection (prefer pooled URL on Vercel). */
export function resolveDatabaseUrl() {
  return (
    firstUrl([
      process.env.POSTGRES_URL,
      process.env.POSTGRES_PRISMA_URL,
      process.env.DATABASE_URL,
      buildFromParts(),
    ]) || 'postgresql://postgres:postgres@localhost:5432/postgres'
  );
}

/** Direct connection for migrate/seed (avoid pgbouncer transaction pooling). */
export function resolveDirectDatabaseUrl() {
  return (
    firstUrl([
      process.env.POSTGRES_URL_NON_POOLING,
      process.env.DATABASE_URL,
      process.env.POSTGRES_URL,
      buildFromParts(),
    ]) || 'postgresql://postgres:postgres@localhost:5432/postgres'
  );
}

export function isLocalPostgres(url = '') {
  return /localhost|127\.0\.0\.1/i.test(url);
}

export function isManagedPostgres(url = '') {
  return /supabase\.co|pooler\.supabase|neon\.tech|amazonaws\.com/i.test(url);
}

/**
 * pg Client/Pool options that avoid "self-signed certificate in certificate chain"
 * with Supabase / managed Postgres.
 */
export function getPgConfig(connectionString) {
  const raw = stripQuotes(connectionString);
  const cleaned = stripSslMode(raw);
  const local = isLocalPostgres(cleaned);

  return {
    connectionString: cleaned,
    ssl: local ? false : { rejectUnauthorized: false },
  };
}
