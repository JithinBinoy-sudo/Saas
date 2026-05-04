import { NextResponse } from 'next/server';
import { createAppServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/auth?error=missing_code', url.origin));
  }

  const supabase = createAppServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/auth?error=callback_failed', url.origin));
  }

  return NextResponse.redirect(new URL('/', url.origin));
}
