'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMonth: string; // 'YYYY-MM'
  yearOptions: string[];
};

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
];

export function GenerateBriefingDialog({
  open,
  onOpenChange,
  defaultMonth,
  yearOptions,
}: Props) {
  const router = useRouter();
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefingName, setBriefingName] = useState('');
  const initial = splitMonthValue(defaultMonth);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);

  useEffect(() => {
    if (!open) {
      setIsGenerating(false);
      setError(null);
    }
  }, [open]);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    const revenueMonth = `${joinMonthValue(year, month)}-01`;
    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          revenue_month: revenueMonth,
          model,
          briefing_name: briefingName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Briefing failed (HTTP ${res.status})`);
      }
      onOpenChange(false);
      router.push(`/briefing/${revenueMonth}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Briefing failed');
      setIsGenerating(false);
    }
  }

  function handleEmailKey(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && emailInput.trim()) {
      e.preventDefault();
      const v = emailInput.trim().replace(/,$/, '');
      if (v && !emails.includes(v)) setEmails([...emails, v]);
      setEmailInput('');
    } else if (e.key === 'Backspace' && !emailInput && emails.length) {
      setEmails(emails.slice(0, -1));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">AI Briefing</span>
          </div>
          <DialogTitle className="mt-1">Generate briefing</DialogTitle>
          <DialogDescription>
            Create an executive summary of portfolio performance for the selected
            month, optionally emailed to clients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="briefing-name">Briefing name</Label>
            <Input
              id="briefing-name"
              value={briefingName}
              onChange={(e) => setBriefingName(e.target.value)}
              placeholder="e.g., Q3 Manhattan portfolio"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Analysis model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emails">Email recipients</Label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background">
              {emails.map((e) => (
                <Badge key={e} variant="secondary" className="gap-1 font-normal">
                  {e}
                  <button
                    type="button"
                    onClick={() => setEmails(emails.filter((x) => x !== e))}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${e}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                id="emails"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleEmailKey}
                placeholder={emails.length ? '' : 'Add email and press Enter'}
                className="min-w-[160px] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Recipients receive the briefing as a PDF when generated. Leave empty to
              save without sending.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button className="gap-1.5" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate briefing
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
