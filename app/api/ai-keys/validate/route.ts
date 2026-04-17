import { NextRequest, NextResponse } from 'next/server';
import { createAppServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const provider = request.nextUrl.searchParams.get('provider');
  const key = request.nextUrl.searchParams.get('key');

  if (!provider || !key) {
    return NextResponse.json({ error: 'provider and key are required' }, { status: 400 });
  }

  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) return NextResponse.json({ valid: true });
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({ valid: false, message: 'Invalid OpenAI API key' }, { status: 401 });
      }
      return NextResponse.json({ valid: false, message: `OpenAI responded with ${res.status}` }, { status: 401 });
    }

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
      });
      if (res.ok) return NextResponse.json({ valid: true });
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({ valid: false, message: 'Invalid Anthropic API key' }, { status: 401 });
      }
      return NextResponse.json({ valid: false, message: `Anthropic responded with ${res.status}` }, { status: 401 });
    }

    if (provider === 'google') {
      // Use the Gemini API list models endpoint with API key
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        { method: 'GET' }
      );
      if (res.ok) return NextResponse.json({ valid: true });
      if (res.status === 400 || res.status === 403) {
        return NextResponse.json({ valid: false, message: 'Invalid Google API key' }, { status: 401 });
      }
      return NextResponse.json({ valid: false, message: `Google responded with ${res.status}` }, { status: 401 });
    }

    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Validation failed';
    return NextResponse.json({ valid: false, message }, { status: 500 });
  }
}
