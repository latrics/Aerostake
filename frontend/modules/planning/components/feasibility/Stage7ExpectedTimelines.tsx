'use client';

import React from 'react';
import { Calendar, Lock } from 'lucide-react';
import { PlanningFormData } from './types';

interface Stage7ExpectedTimelinesProps {
  formData: PlanningFormData;
  updateField: (field: keyof PlanningFormData, value: any) => void;
  isClient: boolean;
  isClosed: boolean;
  clientRequestedTenureDays: number | null;
  clientRequestedStartDate: string | null;
  clientRequestedEndDate: string | null;
  children?: React.ReactNode;
}

export function Stage7ExpectedTimelines({
  formData,
  updateField,
  isClient,
  isClosed,
  clientRequestedTenureDays,
  clientRequestedStartDate,
  clientRequestedEndDate,
  children,
}: Stage7ExpectedTimelinesProps) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '8px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            border: '1px solid #d4d4d8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <Calendar size={18} color="#09090b" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
            7. Expected Timelines
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '0.2rem' }}>
            Survey days, mission start/end dates, pilot travel, and post-processing delivery dates.
          </p>
        </div>
      </div>

      {/* Client Requested Tenure & Timelines Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.15rem',
          backgroundColor: '#fafafa',
          border: '1px solid #e4e4e7',
          borderRadius: '6px',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={15} color="#09090b" />
            <span style={{ fontSize: '0.775rem', color: '#71717a', fontWeight: 600 }}>Client Requested Tenure:</span>
            <span style={{ fontSize: '0.825rem', color: '#09090b', fontWeight: 700 }}>
              {clientRequestedTenureDays ? `${clientRequestedTenureDays} Days` : 'Not specified'}
            </span>
          </div>

          {(clientRequestedStartDate || clientRequestedEndDate) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#52525b' }}>
              <span style={{ color: '#71717a' }}>Requested Dates:</span>
              <strong style={{ color: '#09090b' }}>{clientRequestedStartDate || '—'}</strong>
              <span>→</span>
              <strong style={{ color: '#09090b' }}>{clientRequestedEndDate || '—'}</strong>
            </div>
          )}
        </div>

        {!isClient && !isClosed && (clientRequestedTenureDays || clientRequestedStartDate || clientRequestedEndDate) && (
          <button
            type="button"
            onClick={() => {
              if (clientRequestedTenureDays) {
                updateField('expectedSurveyDays', String(clientRequestedTenureDays));
              }
              if (clientRequestedStartDate) {
                updateField('expectedStartDate', clientRequestedStartDate);
              }
              if (clientRequestedEndDate) {
                updateField('expectedEndDate', clientRequestedEndDate);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              height: '28px',
              padding: '0 0.75rem',
              fontSize: '0.725rem',
              fontWeight: 600,
              backgroundColor: '#ffffff',
              color: '#09090b',
              border: '1px solid #d4d4d8',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Use Client Dates</span>
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          padding: '1rem',
          borderRadius: '6px',
          border: '1px solid #e4e4e7',
          backgroundColor: isClient ? '#fafafa' : '#ffffff',
        }}
      >
        <div>
          <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>
              Expected Survey Days
              {clientRequestedTenureDays ? (
                <span style={{ marginLeft: '0.45rem', fontSize: '0.675rem', color: '#09090b', fontWeight: 600, backgroundColor: '#f4f4f5', padding: '1px 5px', borderRadius: '3px', border: '1px solid #e4e4e7' }}>
                  Client: {clientRequestedTenureDays}d
                </span>
              ) : null}
            </span>
            {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
          </label>
          {isClient || isClosed ? (
            <div
              style={{
                width: '100%',
                minHeight: '34px',
                padding: '0.45rem 0.65rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid #e4e4e7',
                borderRadius: '4px',
                backgroundColor: '#fafafa',
                color: '#09090b',
                display: 'flex',
                alignItems: 'center',
                cursor: 'default',
              }}
            >
              {formData.expectedSurveyDays ? `${formData.expectedSurveyDays} Days` : '—'}
            </div>
          ) : (
            <input
              type="number"
              value={formData.expectedSurveyDays}
              onChange={(e) => updateField('expectedSurveyDays', e.target.value)}
              placeholder="—"
              style={{
                width: '100%',
                height: '34px',
                padding: '0 0.65rem',
                fontSize: '0.8rem',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                color: '#09090b',
              }}
            />
          )}
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>
              Expected Starting Date
              {clientRequestedStartDate ? (
                <span style={{ marginLeft: '0.45rem', fontSize: '0.675rem', color: '#09090b', fontWeight: 600, backgroundColor: '#f4f4f5', padding: '1px 5px', borderRadius: '3px', border: '1px solid #e4e4e7' }}>
                  Client: {clientRequestedStartDate}
                </span>
              ) : null}
            </span>
            {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
          </label>
          {isClient || isClosed ? (
            <div
              style={{
                width: '100%',
                minHeight: '34px',
                padding: '0.45rem 0.65rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid #e4e4e7',
                borderRadius: '4px',
                backgroundColor: '#fafafa',
                color: '#09090b',
                display: 'flex',
                alignItems: 'center',
                cursor: 'default',
              }}
            >
              {formData.expectedStartDate || '—'}
            </div>
          ) : (
            <input
              type="date"
              value={formData.expectedStartDate}
              onChange={(e) => updateField('expectedStartDate', e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 0.65rem',
                fontSize: '0.8rem',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                color: '#09090b',
              }}
            />
          )}
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>
              Expected Ending Date
              {clientRequestedEndDate ? (
                <span style={{ marginLeft: '0.45rem', fontSize: '0.675rem', color: '#09090b', fontWeight: 600, backgroundColor: '#f4f4f5', padding: '1px 5px', borderRadius: '3px', border: '1px solid #e4e4e7' }}>
                  Client: {clientRequestedEndDate}
                </span>
              ) : null}
            </span>
            {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
          </label>
          {isClient || isClosed ? (
            <div
              style={{
                width: '100%',
                minHeight: '34px',
                padding: '0.45rem 0.65rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid #e4e4e7',
                borderRadius: '4px',
                backgroundColor: '#fafafa',
                color: '#09090b',
                display: 'flex',
                alignItems: 'center',
                cursor: 'default',
              }}
            >
              {formData.expectedEndDate || '—'}
            </div>
          ) : (
            <input
              type="date"
              value={formData.expectedEndDate}
              onChange={(e) => updateField('expectedEndDate', e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 0.65rem',
                fontSize: '0.8rem',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                color: '#09090b',
              }}
            />
          )}
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Pilot Travel Date</span>
            {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
          </label>
          {isClient || isClosed ? (
            <div
              style={{
                width: '100%',
                minHeight: '34px',
                padding: '0.45rem 0.65rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid #e4e4e7',
                borderRadius: '4px',
                backgroundColor: '#fafafa',
                color: '#09090b',
                display: 'flex',
                alignItems: 'center',
                cursor: 'default',
              }}
            >
              {formData.pilotTravelDate || '—'}
            </div>
          ) : (
            <input
              type="date"
              value={formData.pilotTravelDate}
              onChange={(e) => updateField('pilotTravelDate', e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 0.65rem',
                fontSize: '0.8rem',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                color: '#09090b',
              }}
            />
          )}
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>Data Processing Timeline (Days)</span>
            {(isClient || isClosed) && <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Lock size={10} /> Sealed</span>}
          </label>
          {isClient || isClosed ? (
            <div
              style={{
                width: '100%',
                minHeight: '34px',
                padding: '0.45rem 0.65rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid #e4e4e7',
                borderRadius: '4px',
                backgroundColor: '#fafafa',
                color: '#09090b',
                display: 'flex',
                alignItems: 'center',
                cursor: 'default',
              }}
            >
              {formData.dataDeliveryTimelineDays ? `${formData.dataDeliveryTimelineDays} Days` : '—'}
            </div>
          ) : (
            <input
              type="number"
              value={formData.dataDeliveryTimelineDays}
              onChange={(e) => updateField('dataDeliveryTimelineDays', e.target.value)}
              placeholder="—"
              style={{
                width: '100%',
                height: '34px',
                padding: '0 0.65rem',
                fontSize: '0.8rem',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                color: '#09090b',
              }}
            />
          )}
        </div>
      </div>

      {/* Universal Remarks & Discussion Thread for Stage 7 */}
      {children}
    </div>
  );
}
