export const monthNames = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function splitMonthValue(v: string): { year: string; month: string } {
  const [year, month] = v.split('-');
  return { year, month };
}

export function joinMonthValue(year: string, month: string): string {
  return `${year}-${month}`;
}

export function isoToYearMonth(iso: string): string {
  // 'YYYY-MM-DD' -> 'YYYY-MM'
  return iso.slice(0, 7);
}

export function yearMonthToIso(yearMonth: string): string {
  // 'YYYY-MM' -> 'YYYY-MM-01'
  return `${yearMonth}-01`;
}

export function monthOptionsFromIsoList(months: string[]): { value: string; label: string }[] {
  return months.map((iso) => ({
    value: isoToYearMonth(iso),
    label: new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
  }));
}

export function yearsFromIsoList(months: string[]): string[] {
  const set = new Set<string>();
  months.forEach((iso) => set.add(iso.slice(0, 4)));
  return Array.from(set).sort((a, b) => Number(b) - Number(a));
}
