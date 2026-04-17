import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type KpiCardProps = {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  icon?: React.ReactNode;
};

function DeltaBadge({ delta, label }: { delta: number; label?: string }) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        isPositive && 'bg-green-50 text-green-700',
        isNegative && 'bg-red-50 text-red-700',
        !isPositive && !isNegative && 'bg-slate-100 text-slate-500'
      )}
    >
      {isPositive ? '↑' : isNegative ? '↓' : '–'}
      {Math.abs(delta).toLocaleString()}
      {label && <span className="text-[10px] opacity-70">{label}</span>}
    </span>
  );
}

export function KpiCard({ label, value, delta, deltaLabel, icon }: KpiCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          {icon && <span className="text-slate-400">{icon}</span>}
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {delta != null && <DeltaBadge delta={delta} label={deltaLabel} />}
      </CardContent>
    </Card>
  );
}
