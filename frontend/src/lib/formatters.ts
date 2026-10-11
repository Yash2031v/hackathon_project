/**
 * Data and value formatting utilities
 * Consistent display of scientific units, currency, mass, and human-readable badges.
 */

import type { ContaminationLevel, DataProvenance, WasteCategory, WasteSource } from '../types/domain';

export function formatMassKg(kg: number): string {
  if (isNaN(kg)) return '— kg';
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} t`;
  }
  return `${Math.round(kg).toLocaleString('en-US')} kg`;
}

export function formatVolumeM3(m3: number): string {
  if (isNaN(m3)) return '— m³';
  return `${Math.round(m3).toLocaleString('en-US')} m³`;
}

export function formatEnergyKwh(kwh: number): string {
  if (isNaN(kwh)) return '— kWh';
  if (kwh >= 1000000) {
    return `${(kwh / 1000000).toFixed(2)} GWh`;
  }
  if (kwh >= 1000) {
    return `${(kwh / 1000).toFixed(1)} MWh`;
  }
  return `${Math.round(kwh).toLocaleString('en-US')} kWh`;
}

export function formatCo2Kg(kg: number): string {
  if (isNaN(kg)) return '— kg CO₂e';
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(2)} t CO₂e`;
  }
  return `${Math.round(kg).toLocaleString('en-US')} kg CO₂e`;
}

export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '$—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(pct: number): string {
  if (isNaN(pct)) return '—%';
  return `${pct.toFixed(1)}%`;
}

export function formatYears(years: number | null): string {
  if (years === null || isNaN(years) || years <= 0) return 'Not recoverable';
  if (years > 30) return '> 30 yrs (marginal)';
  return `${years.toFixed(1)} yrs`;
}

export function getWasteCategoryLabel(category: WasteCategory): string {
  switch (category) {
    case 'prepared_food': return 'Prepared Food Scraps';
    case 'raw_kitchen_prep': return 'Raw Prep & Trimmings';
    case 'bakery_grains': return 'Bakery & Grains';
    case 'fruit_vegetable': return 'Fruit & Vegetable Residue';
    case 'dairy_liquids': return 'Dairy & Liquid Food Waste';
    case 'mixed_organic': return 'Mixed Organic Residue';
    default: return category;
  }
}

export function getWasteSourceLabel(source: WasteSource): string {
  switch (source) {
    case 'canteen_kitchen': return 'Central Canteen Kitchen';
    case 'plate_scraps': return 'Student Tray Scraps';
    case 'hostel_dining': return 'Hostel Dining Hall';
    case 'campus_cafe': return 'Campus Coffee & Bakery';
    case 'faculty_club': return 'Faculty Club & Lounge';
    case 'event_hall': return 'Auditorium & Events';
    default: return source;
  }
}

export function getContaminationLabel(level: ContaminationLevel): string {
  switch (level) {
    case 'clean': return 'Clean (<1% inert)';
    case 'low': return 'Low (<5% packaging)';
    case 'moderate': return 'Moderate (5-15% packaging/cutlery)';
    case 'severe': return 'Severe (>15% inorganics)';
    case 'unknown': return 'Not Inspected';
  }
}

export function getProvenanceLabel(provenance: DataProvenance): string {
  switch (provenance) {
    case 'measured': return 'Scale Measured';
    case 'user_provided': return 'Operator Entered';
    case 'assumed': return 'Baseline Assumed';
    case 'estimated': return 'Calculated Estimate';
    case 'simulated': return 'Synthetic Simulation';
    case 'demo': return 'Sample Demo Record';
  }
}
