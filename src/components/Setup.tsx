/** Shown when /api/auth fails, instead of a blank white page. */
export function Setup() {
  return (
    <div className="setup">
      <div className="setup-card">
        <h1>Almost there</h1>
        <p>
          Snowfall Island could not reach its API. It needs a Neon Postgres database to store
          penguins and carry chat between players, and two environment variables:
        </p>
        <pre>
          {'DATABASE_URL=postgresql://user:password@host.neon.tech/neondb?sslmode=require\nSESSION_SECRET=a-long-random-string'}
        </pre>
        <ol>
          <li>
            Create a free project at <strong>neon.com</strong> and copy its connection string.
          </li>
          <li>
            Run <code>db/schema.sql</code> once: <code>npm run db:push</code>.
          </li>
          <li>
            Generate a session secret: <code>openssl rand -hex 32</code>.
          </li>
          <li>
            Put both in <code>.env.local</code> for local dev, and in Vercel → Settings →
            Environment Variables for the deployed site.
          </li>
        </ol>
        <p className="muted">
          Locally the API routes only run under <code>vercel dev</code>, not <code>vite</code>.
        </p>
      </div>
    </div>
  )
}
