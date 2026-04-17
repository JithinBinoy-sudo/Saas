import { validateRow } from '../validateRow';
import type { ReservationRecord } from '../types';

const BASE: ReservationRecord = {
  confirmation_code: 'HM-1',
  listing_nickname: 'Villa',
  check_in_date: '2026-03-03',
  check_out_date: '2026-03-07',
  nights: 4,
  net_accommodation_fare: 1280,
  listing_id: 'LST-1',
  data: {},
};

describe('validateRow', () => {
  it('passes a clean record', () => {
    expect(validateRow(BASE, 2)).toEqual([]);
  });

  it('flags check_out_date <= check_in_date', () => {
    const errors = validateRow({ ...BASE, check_out_date: '2026-03-03' }, 5);
    expect(errors).toContainEqual({
      row: 5,
      field: 'check_out_date',
      message: 'Check-out must be after check-in',
    });
  });

  it('flags nights < 1', () => {
    const errors = validateRow({ ...BASE, nights: 0 }, 5);
    expect(errors).toContainEqual({
      row: 5,
      field: 'nights',
      message: 'Must be at least 1',
    });
  });

  it('flags negative fare', () => {
    const errors = validateRow({ ...BASE, net_accommodation_fare: -10 }, 5);
    expect(errors).toContainEqual({
      row: 5,
      field: 'net_accommodation_fare',
      message: 'Must be zero or positive',
    });
  });

  it('flags nights mismatching the date delta by more than 1', () => {
    const errors = validateRow(
      { ...BASE, check_in_date: '2026-03-03', check_out_date: '2026-03-06', nights: 10 },
      5
    );
    expect(errors).toContainEqual({
      row: 5,
      field: 'nights',
      message: 'Does not match check-in/check-out span',
    });
  });

  it('allows nights off by 1 from date delta (partial-day tolerance)', () => {
    const errors = validateRow(
      { ...BASE, check_in_date: '2026-03-03', check_out_date: '2026-03-07', nights: 5 },
      5
    );
    expect(errors).toEqual([]);
  });
});
