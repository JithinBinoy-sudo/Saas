import type { ReservationRecord, RowError } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function validateRow(record: ReservationRecord, rowNumber: number): RowError[] {
  const errors: RowError[] = [];

  const checkIn = new Date(record.check_in_date + 'T00:00:00Z');
  const checkOut = new Date(record.check_out_date + 'T00:00:00Z');

  if (checkOut.getTime() <= checkIn.getTime()) {
    errors.push({
      row: rowNumber,
      field: 'check_out_date',
      message: 'Check-out must be after check-in',
    });
  }

  if (record.nights < 1) {
    errors.push({ row: rowNumber, field: 'nights', message: 'Must be at least 1' });
  }

  if (record.net_accommodation_fare < 0) {
    errors.push({
      row: rowNumber,
      field: 'net_accommodation_fare',
      message: 'Must be zero or positive',
    });
  }

  if (checkOut.getTime() > checkIn.getTime() && record.nights >= 1) {
    const dateDelta = Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
    if (Math.abs(dateDelta - record.nights) > 1) {
      errors.push({
        row: rowNumber,
        field: 'nights',
        message: 'Does not match check-in/check-out span',
      });
    }
  }

  return errors;
}
