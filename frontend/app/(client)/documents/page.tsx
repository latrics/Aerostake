'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  List,
  LayoutGrid,
  Folder,
  FileText,
  MessageSquare,
  Handshake,
  FileCheck,
  BarChart3,
  Eye,
  Download,
  MoreVertical,
  ChevronRight,
  Info,
} from 'lucide-react';

export default function ClientDocumentsPage() {
  const [docCategoryFilter, setDocCategoryFilter] = useState('all');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docViewMode, setDocViewMode] = useState<'list' | 'grid'>('list');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Detailed Documents dataset matching Figma Documents mockup
  const allDocuments = [
    {
      id: 'doc-1',
      name: 'Project Request Form.pdf',
      description: 'Initial project request submitted by client.',
      category: 'Request',
      project: 'North Zone Survey',
      uploadedBy: 'Amit Raj',
      uploadedOn: '10 May 2025, 10:15 AM',
      size: '1.2 MB',
    },
    {
      id: 'doc-2',
      name: 'Survey Plan v1.0.pdf',
      description: 'Detailed survey plan and scope.',
      category: 'Plan',
      project: 'North Zone Survey',
      uploadedBy: 'Latrics Ops',
      uploadedOn: '16 May 2025, 11:20 AM',
      size: '3.4 MB',
    },
    {
      id: 'doc-3',
      name: 'Client Review Comments.pdf',
      description: 'Client feedback and comments.',
      category: 'Review',
      project: 'North Zone Survey',
      uploadedBy: 'John Doe',
      uploadedOn: '18 May 2025, 03:45 PM',
      size: '1.1 MB',
    },
    {
      id: 'doc-4',
      name: 'Plan Approval.pdf',
      description: 'Approved project plan by client.',
      category: 'Approval',
      project: 'North Zone Survey',
      uploadedBy: 'John Doe',
      uploadedOn: '19 May 2025, 11:20 AM',
      size: '0.9 MB',
    },
    {
      id: 'doc-5',
      name: 'Resource Allocation Sheet.xlsx',
      description: 'Resources and drones allocation details.',
      category: 'Report',
      project: 'North Zone Survey',
      uploadedBy: 'Latrics Ops',
      uploadedOn: '20 May 2025, 09:45 AM',
      size: '2.1 MB',
    },
    {
      id: 'doc-6',
      name: 'NDA Agreement.pdf',
      description: 'Non-disclosure agreement.',
      category: 'Agreement',
      project: 'North Zone Survey',
      uploadedBy: 'John Doe',
      uploadedOn: '12 May 2025, 02:10 PM',
      size: '0.8 MB',
    },
    {
      id: 'doc-7',
      name: 'Execution Log - Day 1.pdf',
      description: 'Execution log for 20 May 2025.',
      category: 'Report',
      project: 'North Zone Survey',
      uploadedBy: 'Pilot: Vikram Singh',
      uploadedOn: '20 May 2025, 05:30 PM',
      size: '2.6 MB',
    },
    {
      id: 'doc-8',
      name: 'Sector 2 Progress Report.pdf',
      description: 'Progress report for sector 2.',
      category: 'Report',
      project: 'North Zone Survey',
      uploadedBy: 'Field Team',
      uploadedOn: '21 May 2025, 10:30 AM',
      size: '1.7 MB',
    },
  ];

  const docCategoryCounts = {
    all: 32,
    request: 6,
    approval: 5,
    agreement: 7,
    plan: 8,
    report: 6,
  };

  const filteredDocuments = allDocuments.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      doc.uploadedBy.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      doc.project.toLowerCase().includes(docSearchQuery.toLowerCase());

    const matchesCategory =
      docCategoryFilter === 'all' ||
      doc.category.toLowerCase() === docCategoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const toggleSelectAllDocs = () => {
    if (selectedDocIds.length === filteredDocuments.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocuments.map((d) => d.id));
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Subheader Title & Action Controls ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b' }}>Project Documents</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            All documents, requests, approvals and agreements related to your projects.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '220px' }}>
            <input
              type="text"
              placeholder="Search documents..."
              value={docSearchQuery}
              onChange={(e) => setDocSearchQuery(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.75rem', height: '32px', paddingRight: '1.8rem' }}
            />
            <Search size={13} color="#71717a" style={{ position: 'absolute', right: '8px', top: '9px' }} />
          </div>

          {/* Filter Button */}
          <button
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', height: '32px', fontSize: '0.75rem' }}
          >
            <Filter size={13} /> Filter
          </button>

          {/* View Switchers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              onClick={() => setDocViewMode('list')}
              style={{
                width: '30px',
                height: '30px',
                border: docViewMode === 'list' ? '1px solid #09090b' : '1px solid var(--border-color)',
                backgroundColor: docViewMode === 'list' ? '#f4f4f5' : '#ffffff',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setDocViewMode('grid')}
              style={{
                width: '30px',
                height: '30px',
                border: docViewMode === 'grid' ? '1px solid #09090b' : '1px solid var(--border-color)',
                backgroundColor: docViewMode === 'grid' ? '#f4f4f5' : '#ffffff',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2-Column Split: Category Sidebar Folders & Documents Table ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Left Column: Category Folder List */}
        <div className="wf-card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {[
            { id: 'all', label: 'All Documents', count: docCategoryCounts.all, icon: Folder },
            { id: 'request', label: 'Requests', count: docCategoryCounts.request, icon: FileText },
            { id: 'approval', label: 'Approvals', count: docCategoryCounts.approval, icon: MessageSquare },
            { id: 'agreement', label: 'Agreements', count: docCategoryCounts.agreement, icon: Handshake },
            { id: 'plan', label: 'Plans', count: docCategoryCounts.plan, icon: FileCheck },
            { id: 'report', label: 'Reports', count: docCategoryCounts.report, icon: BarChart3 },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = docCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setDocCategoryFilter(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: isActive ? '#f4f4f5' : 'transparent',
                  color: isActive ? '#09090b' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon size={14} />
                  <span>{cat.label}</span>
                </div>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{cat.count}</span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Documents Table */}
        <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="wf-table">
            <thead>
              <tr>
                <th style={{ width: '38px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedDocIds.length > 0 && selectedDocIds.length === filteredDocuments.length}
                    onChange={toggleSelectAllDocs}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ width: '38%' }}>Document Name</th>
                <th style={{ width: '12%' }}>Category</th>
                <th style={{ width: '15%' }}>Uploaded By</th>
                <th style={{ width: '18%' }}>Uploaded On</th>
                <th style={{ width: '8%' }}>Size</th>
                <th style={{ width: '9%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No matching documents found.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      style={{
                        backgroundColor: isSelected ? '#fafafa' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectDoc(doc.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Document Name & Description */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <FileText size={16} color="#71717a" style={{ flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.825rem', color: '#09090b', lineHeight: 1.3 }}>
                              {doc.name}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                              {doc.description}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '3px',
                            border: '1px solid #d4d4d8',
                            backgroundColor: '#f4f4f5',
                            display: 'inline-block',
                          }}
                        >
                          {doc.category}
                        </span>
                      </td>

                      {/* Uploaded By */}
                      <td>
                        <span style={{ fontSize: '0.75rem', color: '#09090b', fontWeight: 500 }}>
                          {doc.uploadedBy}
                        </span>
                      </td>

                      {/* Uploaded On */}
                      <td>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                          {doc.uploadedOn}
                        </span>
                      </td>

                      {/* Size */}
                      <td>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                          {doc.size}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            title="View Document"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.2rem',
                              color: '#71717a',
                            }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            title="Download Document"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.2rem',
                              color: '#71717a',
                            }}
                          >
                            <Download size={14} />
                          </button>
                          <button
                            title="More Actions"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.2rem',
                              color: '#71717a',
                            }}
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Table Footer / Pagination */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Showing 1 to {filteredDocuments.length} of {docCategoryCounts.all} documents</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                style={{
                  width: '26px',
                  height: '26px',
                  border: '1px solid #09090b',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                1
              </button>
              <button
                style={{
                  width: '26px',
                  height: '26px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  color: '#71717a',
                }}
              >
                2
              </button>
              <button
                style={{
                  width: '26px',
                  height: '26px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  color: '#71717a',
                }}
              >
                3
              </button>
              <button
                style={{
                  width: '26px',
                  height: '26px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  color: '#71717a',
                }}
              >
                4
              </button>
              <button
                style={{
                  width: '26px',
                  height: '26px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#71717a',
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Help Tip Footnote ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
        <Info size={13} />
        <span>Can&apos;t find a document? Contact Latrics Ops or raise a request.</span>
      </div>
    </div>
  );
}
