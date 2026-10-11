import React, { useState } from 'react';
import { 
  Plus, 
  Search,
  FileSpreadsheet
} from 'lucide-react';
import { exportWasteRecordsToCsv, downloadCsvFile } from '../../domain/services/csvExportService';
import type { 
  WasteRecord 
} from '../../types/domain';
import { 
  formatMassKg, 
  getWasteCategoryLabel, 
  getWasteSourceLabel 
} from '../../lib/formatters';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { WasteLogForm } from './WasteLogForm';

interface WasteLogPageProps {
  records: WasteRecord[];
  siteId: string;
  onAddRecord: (record: WasteRecord) => void;
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
}

export const WasteLogPage: React.FC<WasteLogPageProps> = ({
  records,
  siteId,
  onAddRecord,
  isFormOpen,
  setIsFormOpen,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [provenanceFilter, setProvenanceFilter] = useState<string>('all');
  const [contaminationFilter, setContaminationFilter] = useState<string>('all');

  // Filtering logic
  const filteredRecords = records.filter((r) => {
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
    if (provenanceFilter !== 'all' && r.provenance !== provenanceFilter) return false;
    if (contaminationFilter !== 'all' && r.contamination !== contaminationFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNotes = r.notes?.toLowerCase().includes(q);
      const matchSource = getWasteSourceLabel(r.source).toLowerCase().includes(q);
      const matchCat = getWasteCategoryLabel(r.category).toLowerCase().includes(q);
      const matchDate = r.date.includes(q);
      if (!matchNotes && !matchSource && !matchCat && !matchDate) return false;
    }
    return true;
  });

  const filteredTotalKg = filteredRecords.reduce((sum, r) => sum + r.massKg, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-stone)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Data Collection &amp; Weighing Slips
          </span>
          <h2
            className="serif-heading"
            style={{
              fontSize: '28px',
              fontWeight: 600,
              marginTop: '2px',
              color: 'var(--color-deep-pine)',
            }}
          >
            Institutional Waste Log
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-stone)', marginTop: '4px' }}>
            Auditable registry of organic waste streams, kitchen prep trimmings, and plate scrap collection.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => {
              if (filteredRecords.length === 0) return;
              const csv = exportWasteRecordsToCsv(filteredRecords);
              downloadCsvFile(csv, `waste-log-${siteId}-${new Date().toISOString().split('T')[0]}.csv`);
            }}
            disabled={filteredRecords.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-charcoal)',
              padding: '9px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: 'var(--shadow-subtle)',
              cursor: filteredRecords.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredRecords.length === 0 ? 0.6 : 1,
            }}
          >
            <FileSpreadsheet size={15} color="var(--color-forest)" />
            <span>Export Filtered CSV ({filteredRecords.length})</span>
          </button>

          <button
            onClick={() => setIsFormOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-forest)',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13.5px',
              fontWeight: 600,
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <Plus size={16} />
            <span>New Waste Entry</span>
          </button>
        </div>
      </div>

      {/* Modal / Form Card when Open */}
      {isFormOpen && (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '2px solid var(--color-forest)',
            borderRadius: 'var(--radius-md)',
            padding: '24px 28px',
            boxShadow: 'var(--shadow-modal)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                Record New Batch Weighing
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-stone)' }}>
                Enter date, mass from scale ticket, and inspect for non-organic contamination.
              </p>
            </div>
            <Badge variant="provenance" provenance="user_provided">Manual Audit Entry</Badge>
          </div>

          <WasteLogForm
            siteId={siteId}
            onSaveRecord={(newRec) => {
              onAddRecord(newRec);
              setIsFormOpen(false);
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Input */}
          <div
            style={{
              flex: '1 1 260px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-warm-paper)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
            }}
          >
            <Search size={16} color="var(--color-stone)" />
            <input
              type="text"
              placeholder="Search by notes, batch date, or source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '13px',
              color: 'var(--color-charcoal)',
            }}
          >
            <option value="all">All Categories</option>
            <option value="prepared_food">Prepared Food Scraps</option>
            <option value="raw_kitchen_prep">Raw Kitchen Prep</option>
            <option value="bakery_grains">Bakery &amp; Grains</option>
            <option value="fruit_vegetable">Fruit &amp; Vegetable</option>
            <option value="mixed_organic">Mixed Organic</option>
          </select>

          {/* Source Dropdown */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '13px',
              color: 'var(--color-charcoal)',
            }}
          >
            <option value="all">All Sources</option>
            <option value="canteen_kitchen">Central Canteen</option>
            <option value="plate_scraps">Plate Scraps</option>
            <option value="hostel_dining">Hostel Dining</option>
            <option value="campus_cafe">Campus Cafe</option>
            <option value="event_hall">Event Hall</option>
          </select>

          {/* Contamination Filter */}
          <select
            value={contaminationFilter}
            onChange={(e) => setContaminationFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '13px',
              color: 'var(--color-charcoal)',
            }}
          >
            <option value="all">All Contamination Levels</option>
            <option value="clean">Clean Only</option>
            <option value="low">Low (&lt;5%)</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>

          {/* Provenance Filter */}
          <select
            value={provenanceFilter}
            onChange={(e) => setProvenanceFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '13px',
              color: 'var(--color-charcoal)',
            }}
          >
            <option value="all">All Provenance</option>
            <option value="measured">Direct Scale Measured</option>
            <option value="user_provided">Operator Entered</option>
            <option value="demo">Sample Demo Records</option>
          </select>
        </div>

        {/* Filter Summary Strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12.5px',
            color: 'var(--color-stone)',
            borderTop: '1px solid var(--color-border-subtle)',
            paddingTop: '10px',
          }}
        >
          <span>
            Showing <strong>{filteredRecords.length}</strong> of {records.length} records
          </span>
          <span className="tabular-nums">
            Filtered Subtotal: <strong>{formatMassKg(filteredTotalKg)}</strong>
          </span>
        </div>
      </div>

      {/* Main Table / Empty State */}
      {filteredRecords.length === 0 ? (
        <EmptyState
          title="No Matching Waste Records"
          description="Try relaxing your search terms or filter selections to view logged batches."
          action={
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setSourceFilter('all');
                setProvenanceFilter('all');
                setContaminationFilter('all');
              }}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-forest)',
                textDecoration: 'underline',
              }}
            >
              Clear All Filters
            </button>
          }
        />
      ) : (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-surface-subtle)',
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-stone)',
                  }}
                >
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Source</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Mass</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Contamination</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Provenance</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Auditor Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      transition: 'background-color var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="tabular-nums" style={{ padding: '14px 16px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {record.date}
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      {getWasteSourceLabel(record.source)}
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      {getWasteCategoryLabel(record.category)}
                    </td>
                    <td className="tabular-nums" style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--color-deep-pine)', whiteSpace: 'nowrap' }}>
                      {record.massKg} kg
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <Badge variant="contamination" contamination={record.contamination} />
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <Badge variant="provenance" provenance={record.provenance} />
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-stone)', maxWidth: '300px', fontSize: '12.5px' }}>
                      {record.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
