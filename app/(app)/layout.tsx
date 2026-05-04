import { redirect } from 'next/navigation';
import { createAppServerClient } from '@/lib/supabase/server';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
