import { describe, it, expect } from 'vitest';
import { evaluatePathwayRules } from '../services/pathwayRuleEngine';
import type { WasteRecord } from '../schemas/wasteRecord.schema';

describe('Deterministic Pathway Hierarchy Rule Engine', () => {
  it('returns explicit insufficient_data state when zero waste records exist', () => {
    const result = evaluatePathwayRules([]);
    expect(result.status).toBe('insufficient_data');
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0].suitability).toBe('insufficient_data');
    expect(result.missingData).toContain('Logged waste batch records');
  });

  it('prioritizes waste prevention when cooked overproduction exceeds 15% threshold', () => {
    const records: WasteRecord[] = [
      {
        id: 'r1',
        siteId: 'site-1',
        date: '2026-03-25',
        source: 'canteen_kitchen',
        category: 'prepared_food', // cooked food
        massKg: 300,
        massUnit: 'kg',
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-25T12:00:00Z',
      },
      {
        id: 'r2',
        siteId: 'site-1',
        date: '2026-03-25',
        source: 'canteen_kitchen',
        category: 'raw_kitchen_prep',
        massKg: 100,
        massUnit: 'kg',
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-25T12:00:00Z',
      },
    ];

    const result = evaluatePathwayRules(records);
    expect(result.status).toBe('evaluated');

    const prevention = result.candidates.find(c => c.pathway === 'prevention');
    expect(prevention).toBeDefined();
    expect(prevention!.suitability).toBe('promising');
    expect(prevention!.isPrioritized).toBe(true);
    expect(prevention!.reasons[0]).toMatch(/preventable preparation surplus/);
  });

  it('qualifies Anaerobic Digestion as promising when daily volume exceeds 300 kg/day', () => {
    const records: WasteRecord[] = [
      {
        id: 'r1',
        siteId: 'site-1',
        date: '2026-03-25',
        source: 'plate_scraps',
        category: 'prepared_food',
        massKg: 420,
        massUnit: 'kg',
        contamination: 'low',
        provenance: 'measured',
        createdAt: '2026-03-25T12:00:00Z',
      },
      {
        id: 'r2',
        siteId: 'site-1',
        date: '2026-03-26',
        source: 'canteen_kitchen',
        category: 'raw_kitchen_prep',
        massKg: 380,
        massUnit: 'kg',
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-26T12:00:00Z',
      },
    ];

    const result = evaluatePathwayRules(records);
    const ad = result.candidates.find(c => c.pathway === 'anaerobic_digestion');
    expect(ad).toBeDefined();
    expect(ad!.suitability).toBe('promising');
    expect(ad!.reasons[0]).toMatch(/meets minimum viability threshold/);
  });

  it('downgrades Anaerobic Digestion to conditional when generation volume is below 100 kg/day', () => {
    const records: WasteRecord[] = [
      {
        id: 'r1',
        siteId: 'site-1',
        date: '2026-03-25',
        source: 'campus_cafe',
        category: 'fruit_vegetable',
        massKg: 45,
        massUnit: 'kg',
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-25T12:00:00Z',
      },
    ];

    const result = evaluatePathwayRules(records);
    const ad = result.candidates.find(c => c.pathway === 'anaerobic_digestion');
    expect(ad).toBeDefined();
    expect(ad!.suitability).toBe('conditional');
    expect(ad!.reasons[0]).toMatch(/below standalone continuous micro-AD threshold/);
  });

  it('enforces food hygiene guardrails: plate scraps are strictly ineligible for human redistribution', () => {
    const records: WasteRecord[] = [
      {
        id: 'r1',
        siteId: 'site-1',
        date: '2026-03-25',
        source: 'plate_scraps', // post consumer
        category: 'prepared_food',
        massKg: 350,
        massUnit: 'kg',
        contamination: 'low',
        provenance: 'measured',
        createdAt: '2026-03-25T12:00:00Z',
      },
    ];

    const result = evaluatePathwayRules(records);
    const redistribution = result.candidates.find(c => c.pathway === 'redistribution');
    expect(redistribution).toBeDefined();
    expect(redistribution!.constraints[0]).toMatch(/Post-consumer plate scraps .* strictly ineligible/);
  });

  it('adds depackaging pre-requisite constraint when severe inert contamination is present', () => {
    const records: WasteRecord[] = [
      {
        id: 'r1',
        siteId: 'site-1',
        date: '2026-03-25',
        source: 'canteen_kitchen',
        category: 'mixed_organic',
        massKg: 400,
        massUnit: 'kg',
        contamination: 'severe', // >15% plastics/cutlery
        provenance: 'measured',
        createdAt: '2026-03-25T12:00:00Z',
      },
    ];

    const result = evaluatePathwayRules(records);
    const ad = result.candidates.find(c => c.pathway === 'anaerobic_digestion');
    expect(ad).toBeDefined();
    expect(ad!.constraints.some(c => c.includes('High inert contamination detected'))).toBe(true);
  });
});
