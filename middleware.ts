import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/auth'];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/auth')) return true;
  return PUBLIC_PATHS.includes(pathname);
}

function isAdminPath(pathname: string): boolean {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;
  // Dashboard admin hub (members use /dashboard/admin/setup only — not gated here)
  if (pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/')) {
    if (pathname === '/dashboard/admin/setup' || pathname.startsWith('/dashboard/admin/setup/')) {
      return false;
    }
    return true;
  }
  return false;
}

function redirect(request: NextRequest, target: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = '';
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isPublicPath(pathname)) {
      return response;
    }
    return redirect(request, '/auth');
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  const role: 'admin' | 'member' = userRow?.role ?? 'member';
  const companyId: string | undefined = userRow?.company_id;

  let schemaDeployed = false;
  let companyMode: string | null = null;
  if (companyId) {
    const { data: companyRow } = await supabase
      .from('companies')
      .select('schema_deployed, mode')
      .eq('id', companyId)
      .single();
    schemaDeployed = companyRow?.schema_deployed === true;
    companyMode = companyRow?.mode ?? null;
  }

  if (pathname.startsWith('/auth')) {
    // Allow the auth UI even when onboarding isn't complete — otherwise users get
    // "stuck" behind forced redirects and can't switch accounts / sign out cleanly.
    if (schemaDeployed) return redirect(request, '/dashboard');
    return response;
  }

  if (isAdminPath(pathname)) {
    if (role !== 'admin') return redirect(request, '/dashboard/admin/setup');
    return response;
  }

  if (pathname.startsWith('/dashboard')) {
    if (!schemaDeployed) return redirect(request, '/onboarding');
    if (companyMode === 'byos' && pathname.startsWith('/dashboard/upload')) {
      return redirect(request, '/dashboard/settings');
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
