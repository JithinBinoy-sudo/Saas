import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type OpenAIBody = { type: 'openai'; key: string };
type SupabaseBody = { type: 'supabase'; url: string; service_key: string };
type Body = OpenAIBody | SupabaseBody;

export async function POST(request: Request) {
  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object' || !('type' in payload)) {
    return NextResponse.json({ error: 'Missing type' }, { status: 400 });
  }

  if (payload.type === 'openai') {
    const key = payload.key?.trim();
    if (!key) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return NextResponse.json({ ok: true }, { status: 200 });
      }
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          { error: 'Invalid API key — OpenAI rejected the credentials.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `OpenAI responded with status ${res.status}` },
        { status: 500 }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        { error: `Failed to reach OpenAI: ${message}` },
        { status: 500 }
      );
    }
  }

  if (payload.type === 'supabase') {
    const { url, service_key } = payload;
    if (!url || !service_key) {
      return NextResponse.json(
        { error: 'Both supabase_url and service_key are required' },
        { status: 400 }
      );
    }
    try {
      const client = createClient(url, service_key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      // Validate the service role key by hitting the admin auth endpoint.
      // listUsers requires service role and returns quickly.
      const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) {
        return NextResponse.json(
          { error: `Supabase rejected credentials: ${error.message}` },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: 'Unsupported type' }, { status: 400 });
}
