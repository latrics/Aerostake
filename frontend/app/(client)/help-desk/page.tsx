'use client';

import React, { useState } from 'react';

export default function ClientHelpDeskPage() {
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('technical');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does survey requirement versioning (#001, #002) work?',
      a: 'Whenever you submit survey requirements, Aerostake creates an immutable version record. If your project parameters change (such as expanding target acreage or requesting additional sensor modalities), submitting a revision creates a new version without deleting historical records, preserving full auditability.',
    },
    {
      q: 'What happens when I approve an Operational Flight Plan?',
      a: 'Approving a flight plan commits the estimated flight hours, sensor selection, and budget quotation. This immediately triggers the project state to APPROVED, permitting Latrics Operations engineers to subdivide the boundary into discrete flight sectors and allocate certified DGCA pilots and RTK drone hardware.',
    },
    {
      q: 'Can I request changes to an operational flight plan?',
      a: 'Yes! If the flight strategy or estimated timeline requires adjustment, click "Request Changes" on the plan viewer. Providing your feedback marks the current plan as SUPERSEDED and alerts the planning team to revise and republish an updated schedule.',
    },
    {
      q: 'What drone sensor modalities does Aerostake support?',
      a: 'Our enterprise fleet supports Radiometric Thermal IR (FLIR Vue Pro R / Zenmuse H20T for solar hotspot and string-level fault detection), High-Resolution Visual RGB Orthomosaics (48MP-100MP photogrammetry), LiDAR point clouds for digital elevation modeling (DEM), and Multispectral sensors for vegetation and terrain inspection.',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setSubmitted(true);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
          Client Support & Operations Help Desk
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Access documentation, operational FAQs, or reach out directly to the Latrics flight dispatch team.
        </p>
      </div>

      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="glass-card">
          <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: '0.5rem' }}>🚁</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Flight Operations Desk
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            Direct coordination for live field missions and airspace clearance.
          </p>
          <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 600 }}>
            ops@latrics.com • +91 (80) 4120-9988
          </div>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: '0.5rem' }}>🛡️</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            DGCA Airspace Compliance
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            Digital Sky green zone permissions and safety auditing.
          </p>
          <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
            compliance@latrics.com
          </div>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: '0.5rem' }}>⚡</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Technical Data & GIS Team
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            Assistance with GeoTIFFs, orthomosaics, and thermal analysis formats.
          </p>
          <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>
            gis-support@latrics.com
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* FAQs */}
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
            Frequently Asked Questions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="glass-panel"
                  style={{
                    overflow: 'hidden',
                    borderColor: isOpen ? 'rgba(59, 130, 246, 0.4)' : undefined,
                  }}
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '1rem 1.25rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.925rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: '0 1.25rem 1.25rem 1.25rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '0.75rem',
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Support Ticket Form */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Open Support Inquiry
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Submit an operational or technical question directly to your project mission coordinator.
          </p>

          {submitted ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.25rem' }}>
                Inquiry Transmitted Successfully
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Ticket ref: <code>TKT-{Math.floor(100000 + Math.random() * 900000)}</code>. Our operations team will respond within 2 business hours.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setTicketSubject('');
                  setTicketMessage('');
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Inquiry Category *</label>
                <select
                  className="form-input"
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                >
                  <option value="technical">Flight Operations & Schedule</option>
                  <option value="planning">Operational Plan & Quotation</option>
                  <option value="data">GIS & Data Deliverables</option>
                  <option value="billing">Milestone Invoices & Payments</option>
                  <option value="other">General Account Inquiry</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Flight schedule adjustment for Project #3"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message Details *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Provide detailed description of your query or asset location..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
                  Submit Support Ticket →
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
