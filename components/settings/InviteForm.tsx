'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type InviteState = 'idle' | 'loading' | 'success' | 'error';

export function InviteForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [state, setState] = useState<InviteState>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    setMessage('');

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(body.error ?? `Error ${res.status}`);
        setState('error');
        return;
      }

      setMessage(`Invite sent to ${email}`);
      setState('success');

      setTimeout(() => {
        setEmail('');
        setRole('member');
        setState('idle');
        setMessage('');
      }, 3000);
    } catch {
      setMessage('Network error. Please try again.');
      setState('error');
    }
  }

  const isLoading = state === 'loading';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="invite-email">Email address</Label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === 'error') setState('idle');
            }}
            placeholder="jane@example.com"
            disabled={isLoading || state === 'success'}
            className="rounded-md border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
            disabled={isLoading || state === 'success'}
            className="rounded-md border px-2 py-1 text-sm disabled:opacity-50"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <Button type="submit" disabled={isLoading || state === 'success'}>
          {isLoading ? 'Sending…' : 'Send Invite'}
        </Button>
      </div>

      {state === 'success' && message && (
        <p className="text-sm text-green-600">{message}</p>
      )}

      {state === 'error' && message && (
        <p className="text-sm text-destructive">{message}</p>
      )}
    </form>
  );
}
