'use client';

import { useRouter, usePathname } from 'next/navigation';
import { format, parseISO } from 'date-fns';
type Props = {
  availableMonths: string[];
  selectedMonth: string;
};

function formatMonth(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMMM yyyy');
  } catch {
    return dateStr;
  }
}

export function MonthPicker({ availableMonths, selectedMonth }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) return;
    const target = `${pathname}?${new URLSearchParams({ month: val }).toString()}`;
    router.push(target);
  }

  return (
    <select
      value={selectedMonth}
      onChange={handleChange}
      className="appearance-none min-w-[180px] max-w-[220px] cursor-pointer rounded-full border border-outline-variant/30 bg-surface-container-lowest py-2.5 pl-4 pr-10 text-sm text-on-surface shadow-[0px_4px_20px_rgba(0,0,0,0.2)] transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
      style={{
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1em',
      }}
    >
      {availableMonths.map((m) => (
        <option key={m} value={m} className="bg-surface-container-high text-on-surface">
          {formatMonth(m)}
        </option>
      ))}
    </select>
  );
}
