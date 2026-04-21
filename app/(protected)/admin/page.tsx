import { redirect } from 'next/navigation';

/** Legacy URL — keep bookmarks working. */
export default function LegacyAdminPage() {
  redirect('/dashboard/admin');
}
