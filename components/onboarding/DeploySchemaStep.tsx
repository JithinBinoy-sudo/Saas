'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BYOS_DDL, BYOS_BOOTSTRAP_SQL } from '@/lib/schema/byos-ddl';
import { cn } from '@/lib/utils';

type Props = {
  onComplete: () => void;
};

type TestStatus = 'idle' | 'testing' | 'success' | 'error';
type DeployPhase = 'idle' | 'running' | 'complete' | 'failed';

type ObjectResult = {
  object: string;
  status: 'created' | 'failed' | 'in_progress';
  error?: string;
};

const TABLES = BYOS_DDL.filter((e) => e.type === 'table');
const VIEWS = BYOS_DDL.filter((e) => e.type === 'view');

export function DeploySchemaStep({ onComplete }: Props) {
  const [url, setUrl] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  const [deployPhase, setDeployPhase] = useState<DeployPhase>('idle');
  const [results, setResults] = useState<ObjectResult[]>([]);
  const [bootstrapMissing, setBootstrapMissing] = useState(false);

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

      if (body.schema_deployed) {
        setDeployPhase('complete');
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
  }

  const showChecklist = testStatus === 'success' && deployPhase === 'idle';
  const showProgress = deployPhase !== 'idle';

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="byos-url">Supabase Project URL</Label>
          <Input
            id="byos-url"
            type="url"
            placeholder="https://xxxx.supabase.co"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              handleCredentialChange();
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="byos-key">Service Role Key</Label>
          <Input
            id="byos-key"
            type="password"
            placeholder="eyJ..."
            value={serviceKey}
            onChange={(e) => {
              setServiceKey(e.target.value);
              handleCredentialChange();
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={testStatus === 'testing' || !url || !serviceKey}
          >
            {testStatus === 'testing' ? 'Testing…' : 'Test Connection'}
          </Button>
          {testStatus === 'success' && (
            <span className="text-sm font-medium text-green-600">✓ Connection successful</span>
          )}
          {testStatus === 'error' && testError && (
            <span className="text-sm font-medium text-destructive">{testError}</span>
          )}
        </div>
      </section>

      {showChecklist && (
        <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Pre-deploy checklist</h3>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Tables to create
            </p>
            <ul className="space-y-1 text-sm">
              {TABLES.map((t) => (
                <li key={t.name} className="text-slate-700">
                  <span className="text-slate-400">○</span> {t.name}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Views to create ({VIEWS.length})
            </p>
            <ul className="space-y-1 text-sm">
              {VIEWS.map((v) => (
                <li key={v.name} className="text-slate-700">
                  <span className="text-slate-400">○</span> {v.name}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500">All operations are idempotent.</p>
          <Button type="button" onClick={handleDeploy}>
            Deploy Schema Now
          </Button>
        </section>
      )}

      {showProgress && (
        <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Deployment progress</h3>
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

          {bootstrapMissing && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">One-time setup required</p>
              <p className="mt-1 text-xs">
                Run this SQL once in your Supabase SQL editor, then retry the deploy:
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-amber-100 p-2 text-xs">
                {BYOS_BOOTSTRAP_SQL}
              </pre>
            </div>
          )}

          {deployPhase === 'failed' && (
            <Button type="button" variant="outline" onClick={handleDeploy}>
              Retry Deploy
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
