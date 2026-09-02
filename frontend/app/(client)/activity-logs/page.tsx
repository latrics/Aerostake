'use client';

import React, { useState } from 'react';
import WireframeBox from '@/components/WireframeBox';
import { Search, Filter, Calendar } from 'lucide-react';

export default function ActivityLogsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'All Activity' },
    { id: 'planning', label: 'Flight Planning' },
    { id: 'execution', label: 'Field Sorties' },
    { id: 'approval', label: 'Approvals' },
    { id: 'payments', label: 'Payments' },
  ];

  const logs = [
    { id: '1', category: 'execution', title: 'Sector 4 Completed', desc: 'Final progress record submitted by Operations. Deliverable ready for review.', timestamp: 'Today, 10:32 AM', project: 'Project Alpha (50MW Solar)' },
    { id: '2', category: 'execution', title: 'Drone Assigned to Sector 5', desc: 'Resource allocation updated. DJI Matrice 350 RTK assigned to pilot@latrics.com.', timestamp: 'Today, 08:45 AM', project: 'Project Alpha (50MW Solar)' },
    { id: '3', category: 'payments', title: 'Payment Verified', desc: 'Milestone 02 payment (₹3.60L) verified by LATRICS billing desk.', timestamp: 'Yesterday, 04:20 PM', project: 'Solar Farm Bravo' },
    { id: '4', category: 'approval', title: 'Project Plan Approved', desc: 'Client approved Operational Plan #001 (14.5 flight hours quotation).', timestamp: '18 Aug 2024, 02:15 PM', project: 'Project Alpha (50MW Solar)' },
    { id: '5', category: 'planning', title: 'Revised Request Submitted', desc: 'Request version #002 created with updated polygon coordinates.', timestamp: '16 Aug 2024, 11:30 AM', project: 'Project Alpha (50MW Solar)' },
    { id: '6', category: 'planning', title: 'Survey Workspace Initialized', desc: 'Project container registered on LATRICS Aerostake.', timestamp: '10 Aug 2024, 09:00 AM', project: 'Project Alpha (50MW Solar)' },
  ];

  const filteredLogs = logs.filter((log) => {
    const matchesCat = activeCategory === 'all' || log.category === activeCategory;
    const matchesSearch =
      log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.project.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Activity & Audit Logs</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Immutable chronological record of project events, pilot dispatches, and milestone updates.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={15} color="#71717a" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2rem', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: activeCategory === cat.id ? '#09090b' : '#ffffff',
              color: activeCategory === cat.id ? '#ffffff' : 'var(--text-secondary)',
              border: '1px solid',
              borderColor: activeCategory === cat.id ? '#09090b' : 'var(--border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Logs Stream */}
      <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            No activity logs match your filter criteria.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredLogs.map((log, idx) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderBottom: idx === filteredLogs.length - 1 ? 'none' : '1px solid var(--border-color)',
                }}
              >
                <WireframeBox width={36} height={36} style={{ borderRadius: '4px', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{log.title}</span>
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', border: '1px solid var(--border-color)', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                      {log.project}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {log.desc}
                  </p>
                </div>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
