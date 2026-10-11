import { describe, it, expect } from 'vitest';
import { 
  convertMass, 
  convertVolume, 
  convertEnergy, 
  convertCurrency, 
  UnitConversionError 
} from '../services/unitConverter';

describe('Unit Conversion Service', () => {
  describe('Mass Conversions', () => {
    it('converts between kg, tonne, and lb accurately', () => {
      expect(convertMass(1000, 'kg', 'tonne')).toBe(1);
      expect(convertMass(2.5, 'tonne', 'kg')).toBe(2500);
      expect(convertMass(1, 'lb', 'kg')).toBeCloseTo(0.453592, 5);
      expect(convertMass(100, 'kg', 'lb')).toBeCloseTo(220.462, 2);
    });

    it('rejects non-finite values', () => {
      expect(() => convertMass(NaN, 'kg', 'tonne')).toThrow(UnitConversionError);
      expect(() => convertMass(Infinity, 'kg', 'tonne')).toThrow(UnitConversionError);
    });
  });

  describe('Volume Conversions', () => {
    it('converts between m3, L, and ft3 accurately', () => {
      expect(convertVolume(1, 'm3', 'L')).toBe(1000);
      expect(convertVolume(500, 'L', 'm3')).toBe(0.5);
      expect(convertVolume(1, 'm3', 'ft3')).toBeCloseTo(35.3147, 3);
    });
  });

  describe('Energy Conversions', () => {
    it('converts between kWh, MJ, MWh, and GWh accurately', () => {
      // 1 kWh = 3.6 MJ
      expect(convertEnergy(1, 'kWh', 'MJ')).toBeCloseTo(3.6, 5);
      expect(convertEnergy(36, 'MJ', 'kWh')).toBeCloseTo(10, 5);
      expect(convertEnergy(1000, 'kWh', 'MWh')).toBe(1);
      expect(convertEnergy(2, 'GWh', 'MWh')).toBe(2000);
    });
  });

  describe('Currency Conversion Safety', () => {
    it('allows same-currency identity without rate record', () => {
      expect(convertCurrency(500, 'USD', 'USD')).toBe(500);
      expect(convertCurrency(1200, 'EUR', 'EUR')).toBe(1200);
    });

    it('throws UnitConversionError if cross-currency conversion is attempted without an exchange rate', () => {
      expect(() => convertCurrency(100, 'USD', 'EUR')).toThrow(UnitConversionError);
      expect(() => convertCurrency(100, 'INR', 'USD')).toThrow(
        /without documented exchange rate/
      );
    });

    it('converts cross-currency when documented exchange rate is provided', () => {
      const rateRecord = {
        from: 'EUR',
        to: 'USD',
        rate: 1.08,
        effectiveDate: '2026-03-25',
        source: 'ECB Reference Rate',
      };
      const converted = convertCurrency(1000, 'EUR', 'USD', rateRecord);
      expect(converted).toBeCloseTo(1080, 2);
    });

    it('rejects rate record with mismatched currency pair', () => {
      const rateRecord = {
        from: 'EUR',
        to: 'USD',
        rate: 1.08,
        effectiveDate: '2026-03-25',
        source: 'ECB',
      };
      expect(() => convertCurrency(1000, 'GBP', 'USD', rateRecord)).toThrow(
        /does not match requested pair/
      );
    });
  });
});
