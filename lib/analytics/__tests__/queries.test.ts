import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchAvailableMonths,
  fetchMonthlySummary,
  fetchTrendData,
  fetchPropertyRows,
  fetchChannelMix,
  fetchDashboardData,
} from '../queries';

/** Creates a mock Supabase client with chainable query builder. */
function mockClient(resolvedData: unknown, resolvedError: unknown = null) {
  const terminal = {
    data: resolvedData,
    error: resolvedError,
  };

  const chain: Record<string, jest.Mock> = {};
  const builder = () =>
    new Proxy(chain, {
      get(_target, prop: string) {
        if (prop === 'then') return undefined; // prevent Promise detection
        if (prop === 'single') {
          return jest.fn(() => Promise.resolve(terminal));
        }
        if (!chain[prop]) {
          chain[prop] = jest.fn(() => builder());
        }
        // For terminal calls that return data directly
        if (prop === 'data') return terminal.data;
        if (prop === 'error') return terminal.error;
        return chain[prop];
      },
    });

  // Make the final promise resolve with terminal
  const queryBuilder = builder();

  // Override so that awaiting the chain yields { data, error }
  const originalFrom = jest.fn(() => queryBuilder);

  return {
    from: originalFrom,
    _chain: chain,
    _terminal: terminal,
  } as unknown as SupabaseClient;
}

/** A simpler mock that intercepts the full chain and resolves. */
function createChainMock(responseData: unknown, responseError: unknown = null) {
  const result = { data: responseData, error: responseError };

  const createChain = (): Record<string, unknown> => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop: string) {
        if (prop === 'then') {
          // Make the chain thenable — resolves with result
          return (resolve: (v: unknown) => void) => resolve(result);
        }
        if (prop === 'single') {
          return () => Promise.resolve(result);
        }
        // Every other method returns a new chainable proxy
        return jest.fn(() => new Proxy({}, handler));
      },
    };
    return new Proxy({}, handler);
  };

  return {
    from: jest.fn(() => createChain()),
  } as unknown as SupabaseClient;
}

describe('fetchAvailableMonths', () => {
  it('returns sorted months from monthly_portfolio_summary', async () => {
    const months = [
      { revenue_month: '2026-03-01' },
      { revenue_month: '2026-02-01' },
      { revenue_month: '2026-01-01' },
    ];
    const client = createChainMock(months);

    const result = await fetchAvailableMonths(client, 'company-1');

    expect(client.from).toHaveBeenCalledWith('monthly_portfolio_summary');
    expect(result).toEqual(['2026-03-01', '2026-02-01', '2026-01-01']);
  });

  it('returns empty array on error', async () => {
    const client = createChainMock(null, { message: 'fail' });
    const result = await fetchAvailableMonths(client, 'company-1');
    expect(result).toEqual([]);
  });

  it('works without companyId (BYOS mode)', async () => {
    const months = [{ revenue_month: '2026-03-01' }];
    const client = createChainMock(months);
    const result = await fetchAvailableMonths(client);
    expect(result).toEqual(['2026-03-01']);
  });
});

describe('fetchMonthlySummary', () => {
  it('returns a summary row for the given month', async () => {
    const summary = {
      revenue_month: '2026-03-01',
      property_count: 5,
      total_nights: 120,
      total_revenue: 48000,
      portfolio_adr: 400,
    };
    const client = createChainMock(summary);

    const result = await fetchMonthlySummary(client, '2026-03-01', 'company-1');

    expect(client.from).toHaveBeenCalledWith('monthly_portfolio_summary');
    expect(result).toEqual(summary);
  });

  it('returns null on error', async () => {
    const client = createChainMock(null, { message: 'not found' });
    const result = await fetchMonthlySummary(client, '2026-03-01');
    expect(result).toBeNull();
  });
});

describe('fetchTrendData', () => {
  it('returns trend data for up to 12 months', async () => {
    const data = [
      { revenue_month: '2025-04-01', property_count: 3, total_nights: 80, total_revenue: 30000, portfolio_adr: 375 },
      { revenue_month: '2025-05-01', property_count: 3, total_nights: 90, total_revenue: 35000, portfolio_adr: 389 },
    ];
    const client = createChainMock(data);

    const months = ['2025-05-01', '2025-04-01'];
    const result = await fetchTrendData(client, months, 'company-1');

    expect(client.from).toHaveBeenCalledWith('monthly_portfolio_summary');
    expect(result).toEqual(data);
  });

  it('returns empty array for empty months', async () => {
    const client = createChainMock([]);
    const result = await fetchTrendData(client, []);
    expect(result).toEqual([]);
  });
});

describe('fetchPropertyRows', () => {
  it('returns property rows for the given month', async () => {
    const rows = [
      {
        listing_id: 'L1',
        listing_nickname: 'Beach House',
        revenue_month: '2026-03-01',
        revenue: 12000,
        occupied_nights: 25,
        adr: 480,
        revenue_delta: 1500,
        nights_delta: 3,
        adr_delta: 20,
        portfolio_median_revenue: 10000,
        portfolio_median_adr: 400,
      },
    ];
    const client = createChainMock(rows);

    const result = await fetchPropertyRows(client, '2026-03-01', 'company-1');

    expect(client.from).toHaveBeenCalledWith('final_reporting_gold');
    expect(result).toEqual(rows);
  });
});

describe('fetchChannelMix', () => {
  it('returns channel mix rows', async () => {
    const rows = [
      { channel_label: 'Airbnb', total_nights: 100, total_revenue: 40000, revenue_share: 0.65 },
      { channel_label: 'Booking.com', total_nights: 50, total_revenue: 20000, revenue_share: 0.35 },
    ];
    const client = createChainMock(rows);

    const result = await fetchChannelMix(client, 'company-1');

    expect(client.from).toHaveBeenCalledWith('channel_mix_summary');
    expect(result).toEqual(rows);
  });
});

describe('fetchDashboardData', () => {
  it('returns empty dashboard when no months exist', async () => {
    const client = createChainMock([]);

    const result = await fetchDashboardData(client, 'company-1');

    expect(result.availableMonths).toEqual([]);
    expect(result.selectedMonth).toBe('');
    expect(result.summary).toBeNull();
    expect(result.trendData).toEqual([]);
    expect(result.properties).toEqual([]);
    expect(result.channelMix).toEqual([]);
  });
});
