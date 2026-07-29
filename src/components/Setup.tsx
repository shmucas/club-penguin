/** Shown when the Supabase env vars are missing, instead of a blank white page. */
export function Setup() {
  return (
    <div className="setup">
      <div className="setup-card">
        <h1>Almost there</h1>
        <p>
          Snowfall Island needs a Supabase project to store penguins and carry chat between players.
          Two environment variables are missing:
        </p>
        <pre>
          {'VITE_SUPABASE_URL=https://your-project-ref.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-public-key'}
        </pre>
        <ol>
          <li>
            Create a free project at <strong>supabase.com</strong>.
          </li>
          <li>
            Run <code>supabase/schema.sql</code> in the SQL Editor.
          </li>
          <li>
            Copy the Project URL and the <em>anon public</em> key from Project Settings → API.
          </li>
          <li>
            Put them in <code>.env.local</code> for local dev, and in Vercel → Settings → Environment
            Variables for the deployed site.
          </li>
        </ol>
        <p className="muted">Restart the dev server after adding them.</p>
      </div>
    </div>
  )
}
