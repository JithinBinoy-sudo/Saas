import { NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  // Handle invite token flow
  if (type === 'invite') {
    const tokenHash = url.searchParams.get('token_hash');
    if (!tokenHash) {
      return NextResponse.redirect(new URL('/auth?error=missing_token', url.origin));
    }

    const supabase = createAppServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'invite',
    });

    if (error || !data.session) {
      return NextResponse.redirect(new URL('/auth?error=invalid_invite', url.origin));
    }

    const newUserId = data.user!.id;
    const email = data.user!.email!;

    // Use admin client to bypass RLS for invite lookup and user creation
    const admin = createAppAdminClient();

    // Look up invitation
    const { data: invite } = await admin
      .from('invitations')
      .select('*')
      .eq('invited_user_id', newUserId)
      .is('accepted_at', null)
      .single();

    if (!invite) {
      return NextResponse.redirect(new URL('/auth?error=invite_expired', url.origin));
    }

    // Create user row
    await admin.from('users').insert({
      id: newUserId,
      company_id: invite.company_id,
      role: invite.role,
      email,
      name: data.user!.user_metadata?.full_name ?? null,
    });

    // Mark invite accepted
    await admin
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    return NextResponse.redirect(new URL('/dashboard', url.origin));
  }

  // Handle standard OAuth code exchange
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/auth?error=missing_code', url.origin));
  }

  const supabase = createAppServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/auth?error=callback_failed', url.origin));
  }

  return NextResponse.redirect(new URL('/dashboard', url.origin));
}
