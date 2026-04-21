/** Mutable state for `initial-setup` route Jest mocks (kept outside `__tests__` so Jest does not run it as a suite). */
export const adminSetupTestState: {
  userRow: { id: string; company_id: string; role: string };
  adminCount: number | null;
  countError: unknown;
  roleUpdateError: unknown;
} = {
  userRow: { id: 'u1', company_id: 'c1', role: 'member' },
  adminCount: 0,
  countError: null,
  roleUpdateError: null,
};
