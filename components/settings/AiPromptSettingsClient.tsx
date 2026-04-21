'use client';

import { useMemo, useState } from 'react';
import { PromptConfigForm, type PromptConfig } from '@/components/settings/PromptConfigForm';
import { PromptTestPanel } from '@/components/settings/PromptTestPanel';

type Props = {
  initialConfig: PromptConfig;
  availableMonths: string[];
};

export function AiPromptSettingsClient({ initialConfig, availableMonths }: Props) {
  const [config, setConfig] = useState<PromptConfig>(initialConfig);

  const months = useMemo(() => availableMonths ?? [], [availableMonths]);

  return (
    <PromptConfigForm
      initialConfig={config}
      onConfigChange={setConfig}
      testPanel={<PromptTestPanel model={config.model} availableMonths={months} />}
    />
  );
}

