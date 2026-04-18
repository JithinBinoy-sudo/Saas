'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type MemberRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  created_at: string;
};

type InviteRow = {
  id: string;
  email: string;
  role: string;
  invited_by_name: string;
  expires_at: string;
  created_at: string;
};

type Props = {
  members: MemberRow[];
  pendingInvites: InviteRow[];
  currentUserId: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TeamMemberTable({ members, pendingInvites, currentUserId }: Props) {
  const router = useRouter();
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [cancellingInvite, setCancellingInvite] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  async function handleRoleChange(memberId: string, newRole: string) {
    setRoleUpdating(memberId);
    setMutationError(null);

    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMutationError(body.error ?? `Error ${res.status}`);
        return;
      }

      router.refresh();
    } catch {
      setMutationError('Network error. Please try again.');
    } finally {
      setRoleUpdating(null);
    }
  }

  async function handleRemoveMember(memberId: string) {
    setRemoving(memberId);
    setMutationError(null);
    setConfirmRemoveId(null);

    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: 'DELETE',
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMutationError(body.error ?? `Error ${res.status}`);
        return;
      }

      router.refresh();
    } catch {
      setMutationError('Network error. Please try again.');
    } finally {
      setRemoving(null);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    setCancellingInvite(inviteId);
    setMutationError(null);

    try {
      const res = await fetch(`/api/team/invites/${inviteId}`, {
        method: 'DELETE',
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMutationError(body.error ?? `Error ${res.status}`);
        return;
      }

      router.refresh();
    } catch {
      setMutationError('Network error. Please try again.');
    } finally {
      setCancellingInvite(null);
    }
  }

  return (
    <div className="space-y-8">
      {mutationError && (
        <p className="text-sm text-destructive">{mutationError}</p>
      )}

      {/* Members table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Members</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.id === currentUserId;
              const isUpdatingRole = roleUpdating === member.id;
              const isRemoving = removing === member.id;

              return (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.name ?? <span className="text-muted-foreground italic">—</span>}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <select
                      className="rounded-md border px-2 py-1 text-sm disabled:opacity-50"
                      value={member.role}
                      disabled={isSelf || isUpdatingRole}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  </TableCell>
                  <TableCell>{formatDate(member.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {confirmRemoveId === member.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Remove member?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isRemoving}
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          {isRemoving ? 'Removing…' : 'Confirm'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmRemoveId(null)}
                        >
                          Cancel
                        </Button>
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isSelf || isRemoving}
                        onClick={() => setConfirmRemoveId(member.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pending invites table */}
      {pendingInvites.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Pending Invites</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Invited by</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvites.map((invite) => {
                const isCancelling = cancellingInvite === invite.id;
                return (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell className="capitalize">{invite.role}</TableCell>
                    <TableCell>{invite.invited_by_name}</TableCell>
                    <TableCell>{formatDate(invite.expires_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isCancelling}
                        onClick={() => handleCancelInvite(invite.id)}
                      >
                        {isCancelling ? 'Cancelling…' : 'Cancel'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
