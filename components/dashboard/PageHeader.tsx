'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  joinMonthValue,
  monthNames,
  splitMonthValue,
} from '@/lib/utils/month';

type MonthOption = { value: string; label: string };

type Props = {
  selectedMonth: string;
  monthOptions: MonthOption[];
  yearOptions: string[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onGenerateClick: () => void;
};

export function PageHeader({
  selectedMonth,
  monthOptions,
  yearOptions,
  searchQuery,
  onSearchChange,
  onGenerateClick,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const { year, month } = splitMonthValue(selectedMonth);

  const navigateToMonth = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('month', `${next}-01`);
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  const monthSet = new Set(monthOptions.map((m) => m.value.slice(5, 7)));

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Portfolio Overview</h1>
        <div className="mt-1.5 flex items-center gap-1">
          <Select
            value={month}
            onValueChange={(m) => navigateToMonth(joinMonthValue(year, m))}
          >
            <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent px-1 text-sm text-muted-foreground shadow-none hover:text-foreground focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {monthNames.map((m) => (
                <SelectItem
                  key={m.value}
                  value={m.value}
                  disabled={!monthSet.has(m.value)}
                >
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={year}
            onValueChange={(y) => navigateToMonth(joinMonthValue(y, month))}
          >
            <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent px-1 text-sm text-muted-foreground shadow-none hover:text-foreground focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search properties..."
            className="h-9 w-64 pl-9"
          />
        </div>
        <Button onClick={onGenerateClick} className="h-9 gap-1.5">
          <Sparkles className="h-4 w-4" />
          Generate Briefing
        </Button>
      </div>
    </div>
  );
}
