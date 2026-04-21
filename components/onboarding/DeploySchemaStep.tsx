'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BYOS_DDL, BYOS_BOOTSTRAP_SQL } from '@/lib/schema/byos-ddl';
import { cn } from '@/lib/utils';

type Props = {
  onBack: () => void | Promise<void>;
  onComplete: () => void;
};

type TestStatus = 'idle' | 'testing' | 'success' | 'error';
type DeployPhase = 'idle' | 'running' | 'complete' | 'failed';
type SyncPhase = 'idle' | 'running' | 'complete' | 'failed';

type ObjectResult = {
  object: string;
  status: 'created' | 'failed' | 'in_progress';
  error?: string;
};

const TABLES = BYOS_DDL.filter((e) => e.type === 'table');
const VIEWS = BYOS_DDL.filter((e) => e.type === 'view');

export function DeploySchemaStep({ onBack, onComplete }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  /** Optional: enables auto bootstrap + DDL over Postgres (never stored). */
  const [databasePassword, setDatabasePassword] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  const [deployPhase, setDeployPhase] = useState<DeployPhase>('idle');
  const [results, setResults] = useState<ObjectResult[]>([]);
  const [bootstrapMissing, setBootstrapMissing] = useState(false);
  const [recommendDatabasePassword, setRecommendDatabasePassword] = useState(false);
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function handleTest() {
    setTestStatus('testing');
    setTestError(null);
    try {
      const res = await fetch('/api/connection/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'supabase', url, service_key: serviceKey }),
      });
      if (res.ok) {
        setTestStatus('success');
        return;
      }
      const body = await res.json().catch(() => ({}));
      setTestError(body.error ?? 'Connection failed');
      setTestStatus('error');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setTestError(message);
      setTestStatus('error');
    }
  }

  async function handleDeploy() {
    setDeployPhase('running');
    setBootstrapMissing(false);
    setRecommendDatabasePassword(false);
    setSyncPhase('idle');
    setSyncMessage(null);
    // Seed all objects as in-progress for visual feedback; server response overwrites.
    setResults(
      BYOS_DDL.map((e) => ({ object: e.name, status: 'in_progress' as const }))
    );

    try {
      const res = await fetch('/api/schema/deploy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          supabase_url: url,
          supabase_service_key: serviceKey,
          ...(databasePassword.trim() ? { database_password: databasePassword.trim() } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setDeployPhase('failed');
        setResults([
          {
            object: 'deploy',
            status: 'failed',
            error: body.error ?? `Deploy failed (${res.status})`,
          },
        ]);
        return;
      }

      const nextResults: ObjectResult[] = (body.results ?? []).map(
        (r: { object: string; status: 'created' | 'failed'; error?: string }) => ({
          object: r.object,
          status: r.status,
          error: r.error,
        })
      );
      setResults(nextResults);
      setBootstrapMissing(Boolean(body.bootstrap_missing));
      setRecommendDatabasePassword(Boolean(body.recommend_database_password));

      if (body.schema_deployed) {
        setDeployPhase('complete');
        // After a successful deploy, run the first BYOS sync automatically so the dashboard
        // has data immediately when the customer's Supabase already contains reservations.
        setSyncPhase('running');
        try {
          const syncRes = await fetch('/api/sync/reservations', { method: 'POST' });
          const syncBody = await syncRes.json().catch(() => ({}));
          if (!syncRes.ok) {
            setSyncPhase('failed');
            setSyncMessage(syncBody.error ?? `Sync failed (${syncRes.status})`);
          } else {
            const rows = Number(syncBody.rows_synced ?? 0);
            setSyncPhase('complete');
            setSyncMessage(rows > 0 ? `Synced ${rows} rows` : 'Sync complete (0 rows found)');
            router.refresh();
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Sync failed';
          setSyncPhase('failed');
          setSyncMessage(message);
        }

        onComplete();
      } else {
        setDeployPhase('failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deploy failed';
      setDeployPhase('failed');
      setResults([{ object: 'deploy', status: 'failed', error: message }]);
    }
  }

  function handleCredentialChange() {
    if (testStatus !== 'idle') {
      setTestStatus('idle');
      setTestError(null);
    }
    if (deployPhase !== 'idle') {
      setDeployPhase('idle');
      setResults([]);
    }
    if (syncPhase !== 'idle') {
      setSyncPhase('idle');
      setSyncMessage(null);
    }
  }

  const showChecklist = testStatus === 'success' && deployPhase === 'idle';
  const showProgress = deployPhase !== 'idle';

  return (
    <div className="w-full max-w-[860px]">
      <div className="ghost-border rounded-3xl bg-white/5 p-6 backdrop-blur-xl ring-1 ring-white/10">
        <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="byos-url" className="text-white/85">
            Supabase Project URL
          </Label>
          <Input
            id="byos-url"
            type="url"
            placeholder="https://xxxx.supabase.co"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setDatabasePassword('');
              handleCredentialChange();
            }}
            className="border-white/10 bg-black/20 text-white placeholder:text-white/35"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="byos-key" className="text-white/85">
            Service Role Key
          </Label>
          <Input
            id="byos-key"
            type="password"
            placeholder="eyJ..."
            value={serviceKey}
            onChange={(e) => {
              setServiceKey(e.target.value);
              handleCredentialChange();
            }}
            className="border-white/10 bg-black/20 text-white placeholder:text-white/35"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="byos-db-password" className="text-white/85">
            Database password{' '}
            <span className="font-normal text-white/45">
              (optional unless PostgREST cannot see <span className="font-mono text-white/60">portlio_exec_sql</span>)
            </span>
          </Label>
          <Input
            id="byos-db-password"
            type="password"
            autoComplete="off"
            placeholder="From Supabase → Settings → Database"
            value={databasePassword}
            onChange={(e) => {
              setDatabasePassword(e.target.value);
              handleCredentialChange();
            }}
            className="border-white/10 bg-black/20 text-white placeholder:text-white/35"
          />
          <p className="text-xs text-white/55">
            If you paste your project&apos;s <span className="text-white/75">postgres</span> database password here,
            Portlio connects to <span className="font-mono text-white/70">db.&lt;ref&gt;.supabase.co</span> once and
            runs bootstrap + DDL over plain Postgres — it does <span className="font-medium text-white/80">not</span>{' '}
            rely on PostgREST&apos;s schema cache (which is where &quot;Could not find the function … portlio_exec_sql&quot;
            comes from on some Supabase projects). The password is not saved.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={testStatus === 'testing' || !url || !serviceKey}
            className="rounded-full border-white/10 bg-transparent text-white/80 hover:bg-white/5 hover:text-white"
          >
            {testStatus === 'testing' ? 'Testing…' : 'Test Connection'}
          </Button>
          {testStatus === 'success' && (
            <span className="text-sm font-medium text-green-400">✓ Connection successful</span>
          )}
          {testStatus === 'error' && testError && (
            <span className="text-sm font-medium text-red-300">{testError}</span>
          )}
        </div>
      </section>

      {showChecklist && (
        <section className="flex flex-col gap-3 rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
          <h3 className="text-sm font-semibold text-white">Pre-deploy checklist</h3>
          <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
              Step 1 — required once on your Supabase project
            </p>
            <p className="mt-1.5 text-sm text-white/85">
              Only if you are <span className="font-medium text-white">not</span> using the optional{' '}
              <span className="font-medium text-white">Database password</span> field above: before{' '}
              <span className="font-medium text-white">Deploy Schema Now</span>, open the{' '}
              <span className="font-medium text-white">SQL Editor</span> in that Supabase project and run the snippet
              below. It installs{' '}
              <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-xs">portlio_exec_sql</code>, which
              Portlio uses for remote DDL when no DB password is supplied.
            </p>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-left text-[11px] leading-relaxed text-white/90">
              {BYOS_BOOTSTRAP_SQL}
            </pre>
            <p className="mt-2 text-xs text-white/55">
              Without this function you may see errors like &quot;Could not find the function public.portlio_exec_sql&quot; for <span className="font-mono">reservations</span>.
              The snippet ends with <span className="font-mono text-white/80">NOTIFY pgrst</span> so PostgREST picks up the new RPC; if you added the function earlier without that line, run{' '}
              <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[10px]">NOTIFY pgrst, &apos;reload schema&apos;;</code> once in this project&apos;s SQL Editor, wait a few seconds, then deploy again.
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-white/55">
              Tables to create
            </p>
            <ul className="space-y-1 text-sm">
              {TABLES.map((t) => (
                <li key={t.name} className="text-white/80">
                  <span className="text-white/45">○</span> {t.name}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-white/55">
              Views to create ({VIEWS.length})
            </p>
            <ul className="space-y-1 text-sm">
              {VIEWS.map((v) => (
                <li key={v.name} className="text-white/80">
                  <span className="text-white/45">○</span> {v.name}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/55">All operations are idempotent.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="h-10 rounded-full border-white/10 bg-transparent text-white/80 hover:bg-white/5 hover:text-white"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleDeploy}
              className="h-10 rounded-full bg-blue-300 px-6 font-medium text-slate-950 hover:bg-blue-200"
            >
              Deploy Schema Now
            </Button>
          </div>
        </section>
      )}

      {showProgress && (
        <section className="flex flex-col gap-3 rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
          <h3 className="text-sm font-semibold text-white">Deployment progress</h3>
          <ul className="space-y-1 text-sm">
            {results.map((r) => (
              <li
                key={r.object}
                className={cn(
                  'flex items-center gap-2',
                  r.status === 'failed' && 'text-destructive'
                )}
              >
                <span aria-hidden="true">
                  {r.status === 'created' && '✓'}
                  {r.status === 'in_progress' && '⟳'}
                  {r.status === 'failed' && '✕'}
                </span>
                <span className="font-mono text-xs">{r.object}</span>
                <span className="text-xs">
                  {r.status === 'created' && 'created'}
                  {r.status === 'in_progress' && 'in progress…'}
                  {r.status === 'failed' && `failed — ${r.error ?? 'unknown error'}`}
                </span>
              </li>
            ))}
          </ul>

          {deployPhase === 'complete' && (
            <div className="rounded-md border border-white/10 bg-black/30 p-3 text-sm text-white/80">
              <p className="font-medium text-white">Syncing your reservations</p>
              <p className="mt-1 text-xs text-white/60">
                We&apos;ll pull rows from your Supabase <span className="font-mono text-white/70">reservations</span>{' '}
                table into Portlio so the dashboard can populate.
              </p>
              <p className="mt-2 text-xs">
                {syncPhase === 'running' && 'Sync in progress…'}
                {syncPhase === 'complete' && (syncMessage ?? 'Sync complete')}
                {syncPhase === 'failed' && (syncMessage ?? 'Sync failed')}
              </p>
            </div>
          )}

          {(bootstrapMissing || recommendDatabasePassword) && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {recommendDatabasePassword && (
                <>
                  <p className="font-medium">Use the database password (most reliable)</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    Supabase&apos;s REST layer (PostgREST) keeps a schema cache that often does not pick up new RPCs even
                    after <span className="font-mono">NOTIFY pgrst</span> — this is a known class of issues on hosted
                    Supabase. Paste the <span className="font-medium">Database password</span> from your project&apos;s{' '}
                    <span className="font-medium">Settings → Database</span> into the field above (same screen, scroll
                    up), then <span className="font-medium">Retry Deploy</span>. Portlio connects to{' '}
                    <span className="font-mono">db.&lt;ref&gt;.supabase.co</span> once; the password is never stored.
                  </p>
                </>
              )}
              {bootstrapMissing && (
                <>
                  <p className={cn('font-medium', recommendDatabasePassword && 'mt-3')}>
                    {recommendDatabasePassword ? 'Alternative: SQL bootstrap' : 'One-time setup required'}
                  </p>
                  <p className="mt-1 text-xs">
                    {recommendDatabasePassword
                      ? 'If you cannot use the database password, run this once in the BYOS project SQL editor, wait ~30s, then retry deploy (may still fail until PostgREST refreshes):'
                      : 'Run this SQL once in your Supabase SQL editor, then retry the deploy:'}
                  </p>
                  <pre className="mt-2 max-h-48 overflow-auto rounded bg-amber-100 p-2 text-xs">
                    {BYOS_BOOTSTRAP_SQL}
                  </pre>
                </>
              )}
            </div>
          )}

          {deployPhase === 'failed' && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDeploy}
              className="rounded-full border-white/10 bg-transparent text-white/80 hover:bg-white/5 hover:text-white"
            >
              Retry Deploy
            </Button>
          )}
        </section>
      )}
        </div>
      </div>
    </div>
  );
}
