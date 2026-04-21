import { Sidebar } from './Sidebar';

type User = {
  name: string | null;
  email: string;
  role: 'admin' | 'member';
};

export type CompanyMode = 'hosted' | 'byos';

type Props = {
  user: User;
  companyMode: CompanyMode;
  workspaceHasAdmin?: boolean;
  children: React.ReactNode;
};

export function DashboardLayout({ user, companyMode, workspaceHasAdmin, children }: Props) {
  return (
    <div className="bg-background text-on-surface antialiased overflow-x-hidden min-h-screen">
      <Sidebar user={user} companyMode={companyMode} workspaceHasAdmin={workspaceHasAdmin} />
      
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 z-40 bg-zinc-950/40 backdrop-blur-md flex items-center justify-between px-8">
        <div className="hidden">Portlio</div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-all hover:shadow-[0_0_8px_rgba(133,173,255,0.4)]">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>
      
      <main className="ml-64 pt-24 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
