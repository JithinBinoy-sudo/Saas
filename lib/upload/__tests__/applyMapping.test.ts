import { applyMapping } from '../applyMapping';
import type { ColumnMappingsBlob } from '../types';

const MAPPING: ColumnMappingsBlob = {
  required: {
    confirmation_code: 'Booking Ref',
    listing_nickname: 'Property',
    check_in_date: 'Check In',
    check_out_date: 'Check Out',
    nights: 'Nights',
    net_accommodation_fare: 'Net Fare',
    listing_id: 'Property ID',
  },
  custom_fields: ['Channel', 'Guest'],
  skipped: ['Notes'],
};

describe('applyMapping', () => {
  it('builds a ReservationRecord from a fully populated row', () => {
    const row = {
      'Booking Ref': 'HM-1',
      Property: 'Villa',
      'Check In': new Date('2026-03-03T00:00:00Z'),
      'Check Out': new Date('2026-03-07T00:00:00Z'),
      Nights: 4,
      'Net Fare': 1280,
      'Property ID': 'LST-1',
      Channel: 'Airbnb',
      Guest: 'Amelia',
      Notes: 'secret',
    };
    const { record, errors } = applyMapping(row, MAPPING, 2);
    expect(errors).toEqual([]);
    expect(record).toEqual({
      confirmation_code: 'HM-1',
      listing_nickname: 'Villa',
      check_in_date: '2026-03-03',
      check_out_date: '2026-03-07',
      nights: 4,
      net_accommodation_fare: 1280,
      listing_id: 'LST-1',
      data: { Channel: 'Airbnb', Guest: 'Amelia' },
    });
  });

  it('accepts ISO date strings for date fields', () => {
    const row = {
      'Booking Ref': 'HM-1',
      Property: 'Villa',
      'Check In': '2026-03-03',
      'Check Out': '2026-03-07',
      Nights: '4',
      'Net Fare': '1280.50',
      'Property ID': 'LST-1',
    };
    const { record, errors } = applyMapping(row, MAPPING, 2);
    expect(errors).toEqual([]);
    expect(record?.check_in_date).toBe('2026-03-03');
    expect(record?.nights).toBe(4);
    expect(record?.net_accommodation_fare).toBe(1280.5);
  });

  it('reports a row error when a required field is missing', () => {
    const row = {
      Property: 'Villa',
      'Check In': '2026-03-03',
      'Check Out': '2026-03-07',
      Nights: 4,
      'Net Fare': 1280,
      'Property ID': 'LST-1',
    };
    const { record, errors } = applyMapping(row, MAPPING, 5);
    expect(record).toBeNull();
    expect(errors).toEqual([
      { row: 5, field: 'confirmation_code', message: 'Required field missing' },
    ]);
  });

  it('reports a row error when a numeric field is non-numeric', () => {
    const row = {
      'Booking Ref': 'HM-1',
      Property: 'Villa',
      'Check In': '2026-03-03',
      'Check Out': '2026-03-07',
      Nights: 'four',
      'Net Fare': 1280,
      'Property ID': 'LST-1',
    };
    const { record, errors } = applyMapping(row, MAPPING, 3);
    expect(record).toBeNull();
    expect(errors).toContainEqual({
      row: 3,
      field: 'nights',
      message: 'Must be a number',
    });
  });

  it('reports a row error when a date field is unparseable', () => {
    const row = {
      'Booking Ref': 'HM-1',
      Property: 'Villa',
      'Check In': 'not-a-date',
      'Check Out': '2026-03-07',
      Nights: 4,
      'Net Fare': 1280,
      'Property ID': 'LST-1',
    };
    const { record, errors } = applyMapping(row, MAPPING, 7);
    expect(record).toBeNull();
    expect(errors).toContainEqual({
      row: 7,
      field: 'check_in_date',
      message: 'Invalid date',
    });
  });

  it('excludes skipped headers and unmapped headers from data jsonb', () => {
    const row = {
      'Booking Ref': 'HM-1',
      Property: 'Villa',
      'Check In': '2026-03-03',
      'Check Out': '2026-03-07',
      Nights: 4,
      'Net Fare': 1280,
      'Property ID': 'LST-1',
      Channel: 'Airbnb',
      Notes: 'hidden',
      Extra: 'unexpected',
    };
    const { record } = applyMapping(row, MAPPING, 2);
    expect(record?.data).toEqual({ Channel: 'Airbnb', Guest: null });
    expect(record?.data).not.toHaveProperty('Notes');
    expect(record?.data).not.toHaveProperty('Extra');
  });
});
