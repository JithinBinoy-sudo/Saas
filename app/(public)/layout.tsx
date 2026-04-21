export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface overflow-x-hidden">
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
