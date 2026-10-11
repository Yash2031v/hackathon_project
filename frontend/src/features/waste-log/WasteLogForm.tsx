import React, { useState } from 'react';
import type { 
  ContaminationLevel, 
  DataProvenance, 
  WasteCategory, 
  WasteRecord, 
  WasteSource 
} from '../../types/domain';
import { AlertCircle, Check } from 'lucide-react';

interface WasteLogFormProps {
  siteId: string;
  onSaveRecord: (newRecord: WasteRecord) => void;
  onCancel: () => void;
}

export const WasteLogForm: React.FC<WasteLogFormProps> = ({
  siteId,
  onSaveRecord,
  onCancel,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(todayStr);
  const [source, setSource] = useState<WasteSource>('canteen_kitchen');
  const [category, setCategory] = useState<WasteCategory>('prepared_food');
  const [massKgStr, setMassKgStr] = useState<string>('');
  const [contamination, setContamination] = useState<ContaminationLevel>('low');
  const [provenance, setProvenance] = useState<DataProvenance>('user_provided');
  const [notes, setNotes] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const massKg = parseFloat(massKgStr);

    if (isNaN(massKg) || massKg <= 0) {
      setErrorMsg('Please enter a valid waste mass greater than 0 kg.');
      return;
    }
    if (massKg > 15000) {
      setErrorMsg('Single batch mass exceeds facility plausibility limit (15,000 kg). Verify weighing slip.');
      return;
    }
    if (!date) {
      setErrorMsg('Please specify a collection date.');
      return;
    }

    setIsSubmitting(true);
    const newRecord: WasteRecord = {
      id: `rec-usr-${Date.now()}`,
      siteId,
      date,
      source,
      category,
      massKg,
      massUnit: 'kg',
      contamination,
      provenance,
      notes: notes.trim() ? notes.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    onSaveRecord(newRecord);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--color-clay-light)',
            border: '1px solid var(--color-clay-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            color: 'var(--color-clay)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Date and Mass Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label
            htmlFor="input-log-date"
            style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
              marginBottom: '6px',
            }}
          >
            Collection Date *
          </label>
          <input
            id="input-log-date"
            type="date"
            required
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setErrorMsg(null);
            }}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '13.5px',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="input-log-mass"
            style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
              marginBottom: '6px',
            }}
          >
            Batch Mass (kg) *
          </label>
          <input
            id="input-log-mass"
            type="number"
            step="0.5"
            min="0.1"
            placeholder="e.g. 385"
            required
            value={massKgStr}
            onChange={(e) => {
              setMassKgStr(e.target.value);
              setErrorMsg(null);
            }}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '13.5px',
            }}
          />
        </div>
      </div>

      {/* Source and Category Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label
            htmlFor="select-log-source"
            style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
              marginBottom: '6px',
            }}
          >
            Facility Source *
          </label>
          <select
            id="select-log-source"
            value={source}
            onChange={(e) => setSource(e.target.value as WasteSource)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '13.5px',
            }}
          >
            <option value="canteen_kitchen">Central Canteen Kitchen</option>
            <option value="plate_scraps">Student Dish Scraps (Post-consumer)</option>
            <option value="hostel_dining">Hostel Dining Hall</option>
            <option value="campus_cafe">Campus Cafe &amp; Bakery</option>
            <option value="faculty_club">Faculty Lounge &amp; Club</option>
            <option value="event_hall">Campus Event Catering</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="select-log-category"
            style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
              marginBottom: '6px',
            }}
          >
            Waste Classification *
          </label>
          <select
            id="select-log-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as WasteCategory)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '13.5px',
            }}
          >
            <option value="prepared_food">Prepared Food Scraps (Cooked / Stews)</option>
            <option value="raw_kitchen_prep">Raw Vegetable &amp; Fruit Trimmings</option>
            <option value="bakery_grains">Bakery, Bread &amp; Cooked Grains</option>
            <option value="fruit_vegetable">Fruit Pulp &amp; Peels</option>
            <option value="dairy_liquids">Dairy &amp; Liquid Food Waste</option>
            <option value="mixed_organic">Mixed Organic Residue</option>
          </select>
        </div>
      </div>

      {/* Contamination and Provenance Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label
            htmlFor="select-log-contamination"
            style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
              marginBottom: '6px',
            }}
          >
            Inert Contamination Level *
          </label>
          <select
            id="select-log-contamination"
            value={contamination}
            onChange={(e) => setContamination(e.target.value as ContaminationLevel)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '13.5px',
            }}
          >
            <option value="clean">Clean (&lt;1% inert matter)</option>
            <option value="low">Low (&lt;5% packaging napkins)</option>
            <option value="moderate">Moderate (5-15% plastic packaging/cutlery)</option>
            <option value="severe">Severe (&gt;15% non-organic trash)</option>
            <option value="unknown">Not Inspected</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="select-log-provenance"
            style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
              marginBottom: '6px',
            }}
          >
            Data Provenance *
          </label>
          <select
            id="select-log-provenance"
            value={provenance}
            onChange={(e) => setProvenance(e.target.value as DataProvenance)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '13.5px',
            }}
          >
            <option value="user_provided">Operator Form Entry</option>
            <option value="measured">Direct Scale Measurement (Verified)</option>
            <option value="demo">Sample Test Record</option>
          </select>
        </div>
      </div>

      {/* Field Notes */}
      <div>
        <label
          htmlFor="textarea-log-notes"
          style={{
            display: 'block',
            fontSize: '12.5px',
            fontWeight: 600,
            color: 'var(--color-deep-pine)',
            marginBottom: '6px',
          }}
        >
          Operational Notes &amp; Observations
        </label>
        <textarea
          id="textarea-log-notes"
          rows={3}
          placeholder="e.g. Dish return bin sorted by kitchen staff; minimal cutlery detected."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            fontSize: '13.5px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--color-border-subtle)',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '9px 18px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            fontSize: '13.5px',
            fontWeight: 500,
            color: 'var(--color-charcoal)',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          id="btn-submit-record"
          disabled={isSubmitting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 20px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-forest)',
            color: '#FFFFFF',
            fontSize: '13.5px',
            fontWeight: 600,
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'wait' : 'pointer',
          }}
        >
          <Check size={16} />
          <span>{isSubmitting ? 'Saving...' : 'Save Record'}</span>
        </button>
      </div>
    </form>
  );
};
