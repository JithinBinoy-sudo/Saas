import { createAppServerClient } from '@/lib/supabase/server';

type Props = {
  userId: string;
};

export async function DashboardPage({ userId }: Props) {
  const supabase = createAppServerClient();

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id, role, name, email')
    .eq('id', userId)
    .single();

  if (!userRow) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <main className="container mx-auto space-y-6 px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Portfolio Overview</h1>
        <p className="text-sm text-muted-foreground">
          Dashboard composition lands in commit 8.
        </p>
      </main>
    </div>
  );
}
