import { Sidebar } from './Sidebar';

type User = {
  name: string | null;
  email: string;
  role: 'admin' | 'member';
};

type Props = {
  user: User;
  children: React.ReactNode;
};

export function DashboardLayout({ user, children }: Props) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
