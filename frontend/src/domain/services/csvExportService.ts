export interface CsvWasteRecordInput {
  id: string;
  siteId: string;
  date: string;
  category: string;
  massKg: number;
  massUnit?: string;
  source: string;
  contamination: string;
  provenance: string;
  createdAt: string;
  notes?: string;
}

export interface CsvAnalysisInput {
  analysisId: string;
  siteId: string;
  executionStatus?: string;
  createdAt: string;
  dateRange: { start: string; end: string };
  recordCount: number;
  totalMassKg: number;
  dailyAverageKg: number;
  predominantCategory: string | null;
  contaminationProfile: { cleanPct: number; moderateSeverePct: number };
  summary: string;
  recommendedNextStep: string;
  metrics?: Array<{ metricId: string; name: string; value: number; unit: string; status: string }>;
  pathwayCandidates: Array<{
    pathway: string;
    title: string;
    suitability: string;
    confidenceLabel?: string;
    reasons: string[];
    constraints: string[];
  }>;
  missingData: string[];
  uncertaintyNotes: string[];
}

/**
 * Sanitizes a cell value to prevent CSV Formula Injection (CWE-1236 / DDE attack).
 * If a string begins with dangerous formula characters, it is prepended with a single quote (').
 * Follows RFC 4180 for escaping commas, double quotes, and line breaks.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  // Handle numbers and booleans directly
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '""';
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  let str = String(value);

  // 1. Check for CSV Formula Injection triggers
  // Dangerous characters: =, +, -, @, \t, \r
  // Note: Pure negative numbers (e.g. "-15.2") are safe numbers, but in text fields
  // strings like "-2+3" or "-SUM(A1:A5)" can be weaponized.
  const isPureNumber = /^-?\d+(\.\d+)?$/.test(str.trim());
  if (!isPureNumber) {
    const trimmed = str.trimStart();
    if (
      str.startsWith('\t') ||
      str.startsWith('\r') ||
      str.startsWith('=') ||
      str.startsWith('+') ||
      str.startsWith('-') ||
      str.startsWith('@') ||
      trimmed.startsWith('=') ||
      trimmed.startsWith('+') ||
      trimmed.startsWith('-') ||
      trimmed.startsWith('@')
    ) {
      // Prepend single quote to neutralize formula evaluation in Excel/Calc
      str = `'${str}`;
    }
  }

  // 2. RFC 4180: If the string contains double quotes, commas, or line breaks, enclose in quotes
  // and escape internal double quotes by doubling them (" -> "")
  const mustQuote =
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.startsWith(' ') ||
    str.endsWith(' ');

  if (mustQuote) {
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return `"${str}"`;
}

/**
 * Generates an auditable CSV document from an array of waste records.
 * Returns empty string if records array is empty.
 */
export function exportWasteRecordsToCsv(records: CsvWasteRecordInput[]): string {
  if (!records || records.length === 0) {
    return '';
  }

  const headers = [
    'Record ID',
    'Site ID',
    'Collection Date',
    'Waste Category',
    'Mass (kg)',
    'Mass Unit',
    'Source Location',
    'Contamination Level',
    'Data Provenance',
    'Logged Timestamp (UTC)',
    'Field Notes',
  ];

  const rows = records.map(r => [
    sanitizeCsvCell(r.id),
    sanitizeCsvCell(r.siteId),
    sanitizeCsvCell(r.date),
    sanitizeCsvCell(r.category),
    sanitizeCsvCell(r.massKg),
    sanitizeCsvCell(r.massUnit || 'kg'),
    sanitizeCsvCell(r.source),
    sanitizeCsvCell(r.contamination),
    sanitizeCsvCell(r.provenance),
    sanitizeCsvCell(r.createdAt),
    sanitizeCsvCell(r.notes || ''),
  ]);

  const csvLines = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.join(',')),
  ];

  return csvLines.join('\r\n');
}

/**
 * Generates an auditable CSV document from an analysis result.
 */
export function exportAnalysisToCsv(analysis: CsvAnalysisInput): string {
  if (!analysis) {
    return '';
  }

  const lines: string[] = [];

  // Section 1: Metadata
  lines.push('"SECTION","ANALYSIS METADATA"');
  lines.push(`"Analysis ID",${sanitizeCsvCell(analysis.analysisId)}`);
  lines.push(`"Site ID",${sanitizeCsvCell(analysis.siteId)}`);
  lines.push(`"Execution Status",${sanitizeCsvCell(analysis.executionStatus || 'completed')}`);
  lines.push(`"Created Timestamp (UTC)",${sanitizeCsvCell(analysis.createdAt)}`);
  lines.push(`"Scope Start Date",${sanitizeCsvCell(analysis.dateRange.start)}`);
  lines.push(`"Scope End Date",${sanitizeCsvCell(analysis.dateRange.end)}`);
  lines.push(`"Record Count",${sanitizeCsvCell(analysis.recordCount)}`);
  lines.push(`"Total Mass (kg)",${sanitizeCsvCell(analysis.totalMassKg)}`);
  lines.push(`"Daily Average Throughput (kg/day)",${sanitizeCsvCell(analysis.dailyAverageKg)}`);
  lines.push(`"Predominant Stream",${sanitizeCsvCell(analysis.predominantCategory || 'unspecified')}`);
  lines.push(`"Clean Stream Ratio (%)",${sanitizeCsvCell(analysis.contaminationProfile.cleanPct)}`);
  lines.push(`"Summary",${sanitizeCsvCell(analysis.summary)}`);
  lines.push(`"Recommended Action",${sanitizeCsvCell(analysis.recommendedNextStep)}`);
  lines.push('');

  // Section 2: Deterministic Metrics
  if (analysis.metrics && analysis.metrics.length > 0) {
    lines.push('"SECTION","DETERMINISTIC METRICS"');
    lines.push('"Metric ID","Metric Name","Value","Unit","Provenance Status"');
    for (const m of analysis.metrics) {
      lines.push([
        sanitizeCsvCell(m.metricId),
        sanitizeCsvCell(m.name),
        sanitizeCsvCell(m.value),
        sanitizeCsvCell(m.unit),
        sanitizeCsvCell(m.status),
      ].join(','));
    }
    lines.push('');
  }

  // Section 3: Waste Pathway Candidates
  lines.push('"SECTION","PATHWAY RECOMMENDATION HIERARCHY"');
  lines.push('"Pathway","Title","Suitability","Confidence","Reasons","Constraints"');
  for (const cand of analysis.pathwayCandidates) {
    lines.push([
      sanitizeCsvCell(cand.pathway),
      sanitizeCsvCell(cand.title),
      sanitizeCsvCell(cand.suitability),
      sanitizeCsvCell(cand.confidenceLabel),
      sanitizeCsvCell(cand.reasons.join('; ')),
      sanitizeCsvCell(cand.constraints.join('; ')),
    ].join(','));
  }
  lines.push('');

  // Section 4: Data Quality & Uncertainty
  lines.push('"SECTION","UNCERTAINTY & BOUNDARY DISCLOSURES"');
  lines.push('"Category","Disclosure Note"');
  for (const gap of analysis.missingData) {
    lines.push(`"Information Gap",${sanitizeCsvCell(gap)}`);
  }
  for (const note of analysis.uncertaintyNotes) {
    lines.push(`"Engineering Boundary",${sanitizeCsvCell(note)}`);
  }

  return lines.join('\r\n');
}

/**
 * Triggers a secure client-side file download of CSV content with UTF-8 BOM.
 */
export function downloadCsvFile(csvContent: string, filename: string): boolean {
  if (!csvContent) {
    return false;
  }

  try {
    const globalObj = globalThis as unknown as {
      document?: {
        createElement: (tag: string) => any;
        body: { appendChild: (el: any) => void; removeChild: (el: any) => void };
      };
    };

    if (!globalObj.document) {
      return false;
    }

    // Add UTF-8 Byte Order Mark (BOM) to ensure Microsoft Excel and Google Sheets
    // correctly parse non-ASCII characters without encoding garble.
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = globalObj.document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    globalObj.document.body.appendChild(link);
    link.click();
    globalObj.document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
