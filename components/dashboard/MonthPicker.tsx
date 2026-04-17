'use client';

import { useRouter, usePathname } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  function handleChange(value: string) {
    const params = new URLSearchParams();
    params.set('month', value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={selectedMonth} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue>{formatMonth(selectedMonth)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableMonths.map((month) => (
          <SelectItem key={month} value={month}>
            {formatMonth(month)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
