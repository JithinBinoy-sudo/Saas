import { redirect } from 'next/navigation';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { InviteForm } from '@/components/settings/InviteForm';
import { TeamMemberTable } from '@/components/settings/TeamMemberTable';

export default async function TeamPage() {
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!userRow || userRow.role !== 'admin') redirect('/dashboard');

  const admin = createAppAdminClient();
  const { company_id } = userRow;

  // Fetch all members of this company
  const { data: members } = await admin
    .from('users')
    .select('id, name, email, role, created_at')
    .eq('company_id', company_id)
    .order('created_at', { ascending: true });

  // Fetch pending invitations (not accepted, not expired)
  const { data: rawInvites } = await admin
    .from('invitations')
    .select('id, email, role, expires_at, created_at, invited_by')
    .eq('company_id', company_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  // Resolve invited_by names
  const inviterIds = [...new Set((rawInvites ?? []).map((i) => i.invited_by as string))];

  let inviterMap: Record<string, string> = {};
  if (inviterIds.length > 0) {
    const { data: inviters } = await admin
      .from('users')
      .select('id, name')
      .in('id', inviterIds);

    inviterMap = Object.fromEntries(
      (inviters ?? []).map((u) => [u.id, u.name ?? u.id])
    );
  }

  const pendingInvites = (rawInvites ?? []).map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    invited_by_name: inviterMap[invite.invited_by] ?? invite.invited_by,
    expires_at: invite.expires_at,
    created_at: invite.created_at,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage team members and send invitations to your workspace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite a team member</CardTitle>
          <CardDescription>
            Send an email invitation to add someone to your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm />
        </CardContent>
      </Card>

      <TeamMemberTable
        members={members ?? []}
        pendingInvites={pendingInvites}
        currentUserId={user.id}
      />
    </div>
  );
}
