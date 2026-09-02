'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import WireframeBox from '@/components/WireframeBox';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Settings as SettingsIcon,
  Info,
  CheckSquare,
  Square,
} from 'lucide-react';

export default function ClientDashboardPage() {
  const [selectedProject, setSelectedProject] = useState('Project Alpha (50MW Solar)');
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(false);
  const [isPaymentsCollapsed, setIsPaymentsCollapsed] = useState(false);

  // Sector Data for Grid Matrix
  const sectors = [
    { code: 'S1', progress: 100, status: 'completed' },
    { code: 'S2', progress: 100, status: 'completed' },
    { code: 'S3', progress: 55, status: 'in_progress' },
    { code: 'S4', progress: 80, status: 'in_progress' },
    { code: 'S5', progress: 30, status: 'in_progress' },
    { code: 'S6', progress: 0, status: 'not_started' },
    { code: 'S7', progress: 0, status: 'not_started' },
    { code: 'S8', progress: null, status: 'na' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── 1. Top 5 KPI Metrics Cards ── */}
      <div className="grid-5">
        {/* Card 1: Active Projects */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
              Active Projects
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.2rem 0' }}>
              3
            </span>
            <Link
              href="/projects"
              style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 500 }}
            >
              View all projects →
            </Link>
          </div>
        </div>

        {/* Card 2: Overall Progress */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
              Overall Progress
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.2rem 0' }}>
              68%
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              Across all projects
            </span>
          </div>
        </div>

        {/* Card 3: Total Sectors */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
              Total Sectors
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.2rem 0' }}>
              21
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              Across all projects
            </span>
          </div>
        </div>

        {/* Card 4: Sectors Completed */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
              Sectors Completed
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.2rem 0' }}>
              14 / 21
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              7 sectors in progress
            </span>
          </div>
        </div>

        {/* Card 5: Client Wallet Balance */}
        <div className="wf-card" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <WireframeBox width={36} height={36} style={{ flexShrink: 0, borderRadius: '4px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
              Client Wallet Balance
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0.2rem 0' }}>
              -₹4.80L
            </span>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              2 payments pending
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Middle Section: Project Map & Needs Your Attention ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        {/* Left: Project Map (Sectors) */}
        <div className="wf-card">
          <div className="wf-card-header">
            <h2 className="wf-title">Project Map (Sectors)</h2>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="form-select"
              style={{ width: 'auto', minWidth: '180px', padding: '0.35rem 0.65rem', fontSize: '0.775rem' }}
            >
              <option value="Project Alpha (50MW Solar)">Select Project</option>
              <option value="Project Alpha (50MW Solar)">Project Alpha (50MW Solar)</option>
              <option value="Solar Farm Bravo">Solar Farm Bravo</option>
              <option value="Wind Turbine Charlie">Wind Turbine Charlie</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.5fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Map Area Visualization Box */}
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: '#fafafa',
                height: '180px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                position: 'relative',
              }}
            >
              <WireframeBox width={42} height={42} style={{ borderRadius: '4px' }}>
                <MapPin size={20} color="#71717a" />
              </WireframeBox>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Map Area</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Sector boundaries on map
                </div>
              </div>
            </div>

            {/* 8-Sector Progress Matrix Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.65rem',
              }}
            >
              {sectors.map((sec) => (
                <div
                  key={sec.code}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    textAlign: 'center',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '75px',
                  }}
                >
                  <span style={{ fontSize: '0.775rem', fontWeight: 800 }}>{sec.code}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0.2rem 0' }}>
                    {sec.progress !== null ? `${sec.progress}%` : '—'}
                  </span>
                  <div className="wf-progress-track" style={{ height: '4px' }}>
                    {sec.progress !== null && (
                      <div
                        className="wf-progress-fill"
                        style={{
                          width: `${sec.progress}%`,
                          backgroundColor: sec.progress === 100 ? '#09090b' : '#52525b',
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-color)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#09090b', borderRadius: '2px' }} />
              <span>Completed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#a1a1aa', borderRadius: '2px' }} />
              <span>In Progress</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '12px', height: '12px', border: '1px solid #71717a', backgroundColor: '#ffffff', borderRadius: '2px' }} />
              <span>Not Started</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '12px', height: '12px', border: '1px dashed #a1a1aa', backgroundColor: '#fafafa', borderRadius: '2px' }} />
              <span>Not Applicable</span>
            </div>
          </div>
        </div>

        {/* Right: Needs Your Attention */}
        <div className="wf-card">
          <div className="wf-card-header">
            <h2 className="wf-title">Needs Your Attention</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Item 1: Plan Awaiting Approval */}
            <Link
              href="/projects"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                transition: 'border-color 0.15s ease',
              }}
            >
              <WireframeBox width={32} height={32} style={{ borderRadius: '4px', flexShrink: 0 }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 }}>
                  1 Plan Awaiting Approval
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Review the revised plan
                </div>
              </div>
              <ChevronRight size={16} color="#71717a" />
            </Link>

            {/* Item 2: Payment Records Pending */}
            <Link
              href="/payments"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
              }}
            >
              <WireframeBox width={32} height={32} style={{ borderRadius: '4px', flexShrink: 0 }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 }}>
                  2 Payment Records Pending
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Total Outstanding: -₹4.80L
                </div>
              </div>
              <ChevronRight size={16} color="#71717a" />
            </Link>

            {/* Item 3: New Report Available */}
            <Link
              href="/documents"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
              }}
            >
              <WireframeBox width={32} height={32} style={{ borderRadius: '4px', flexShrink: 0 }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 }}>
                  New Report Available
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Sector 4 Completion Report
                </div>
              </div>
              <ChevronRight size={16} color="#71717a" />
            </Link>

            {/* Item 4: Help Desk */}
            <Link
              href="/help-desk"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
              }}
            >
              <WireframeBox width={32} height={32} style={{ borderRadius: '4px', flexShrink: 0 }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 }}>
                  Help Desk
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  2 Open Tickets
                </div>
              </div>
              <ChevronRight size={16} color="#71717a" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── 3. Bottom Section: Logs, Payment Overview, and Notifications ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        {/* Left Column: Recent Logs & Payment Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Recent Logs */}
          <div className="wf-card">
            <div
              className="wf-card-header"
              style={{ cursor: 'pointer', marginBottom: isLogsCollapsed ? 0 : '0.85rem' }}
              onClick={() => setIsLogsCollapsed(!isLogsCollapsed)}
            >
              <h2 className="wf-title">Recent Logs</h2>
              {isLogsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </div>

            {!isLogsCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Log 1 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <WireframeBox width={30} height={30} style={{ borderRadius: '4px', flexShrink: 0 }} />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Sector 4 Completed</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Final progress record submitted by Operations
                    </div>
                  </div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    Today, 10:32 AM
                  </span>
                </div>

                {/* Log 2 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <WireframeBox width={30} height={30} style={{ borderRadius: '4px', flexShrink: 0 }} />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Drone Assigned to Sector 5</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Resource allocation updated
                    </div>
                  </div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    Today, 08:45 AM
                  </span>
                </div>

                {/* Log 3 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <WireframeBox width={30} height={30} style={{ borderRadius: '4px', flexShrink: 0 }} />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Payment Verified</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Milestone 02 payment verified by LATRICS
                    </div>
                  </div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    Yesterday, 04:20 PM
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Overview */}
          <div className="wf-card">
            <div
              className="wf-card-header"
              style={{ cursor: 'pointer', marginBottom: isPaymentsCollapsed ? 0 : '0.85rem' }}
              onClick={() => setIsPaymentsCollapsed(!isPaymentsCollapsed)}
            >
              <h2 className="wf-title">Payment Overview</h2>
              {isPaymentsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </div>

            {!isPaymentsCollapsed && (
              <>
                {/* 4 Summary Stats */}
                <div className="grid-4" style={{ marginBottom: '1rem' }}>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.65rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Approved Estimate</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.2rem' }}>₹12.40L</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.65rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Paid / Verified</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.2rem' }}>₹7.60L</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.65rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Outstanding</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.2rem' }}>-₹4.80L</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.65rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Payment Status</div>
                    <div style={{ marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', backgroundColor: '#f4f4f5', borderRadius: '4px', border: '1px solid #d4d4d8' }}>
                        Partially Paid
                      </span>
                    </div>
                  </div>
                </div>

                {/* Milestone Schedule Table */}
                <table className="wf-table" style={{ marginBottom: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Milestone</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Verified On</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Milestone 01</td>
                      <td>₹4.00L</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>Verified</span>
                      </td>
                      <td>12 Aug 2024</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Milestone 02</td>
                      <td>₹3.60L</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>Verified</span>
                      </td>
                      <td>20 Aug 2024</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Milestone 03</td>
                      <td>₹4.80L</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a' }}>Pending</span>
                      </td>
                      <td>—</td>
                    </tr>
                  </tbody>
                </table>

                {/* Disclaimer Footnote */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Payments are recorded and verified by LATRICS. Transaction / transfer happens outside the application.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Notifications Feed */}
        <div className="wf-card">
          <div className="wf-card-header">
            <h2 className="wf-title">Notifications</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.725rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Mark all as read
              </button>
              <SettingsIcon size={14} color="#71717a" style={{ cursor: 'pointer' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            {/* Notification 1 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <WireframeBox width={28} height={28} style={{ borderRadius: '4px', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '0.775rem', fontWeight: 700 }}>Sector 4 marked as completed</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Final progress record submitted by Operations.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>10:32 AM</span>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#09090b', borderRadius: '50%' }} />
              </div>
            </div>

            {/* Notification 2 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <WireframeBox width={28} height={28} style={{ borderRadius: '4px', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '0.775rem', fontWeight: 700 }}>Drone assigned to Sector 5</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Resource allocation has been updated.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>08:45 AM</span>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#09090b', borderRadius: '50%' }} />
              </div>
            </div>

            {/* Notification 3 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <WireframeBox width={28} height={28} style={{ borderRadius: '4px', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '0.775rem', fontWeight: 700 }}>Payment verified</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Milestone 02 payment verified by LATRICS.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Yesterday, 04:20 PM</span>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#09090b', borderRadius: '50%' }} />
              </div>
            </div>

            {/* Notification 4 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <WireframeBox width={28} height={28} style={{ borderRadius: '4px', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '0.775rem', fontWeight: 700 }}>Project plan approved</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Your project plan has been approved.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>18 Aug 2024</span>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#09090b', borderRadius: '50%' }} />
              </div>
            </div>

            {/* Notification 5 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <WireframeBox width={28} height={28} style={{ borderRadius: '4px', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '0.775rem', fontWeight: 700 }}>Revised request submitted</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  A new request version has been submitted.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>16 Aug 2024</span>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#09090b', borderRadius: '50%' }} />
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
            <Link
              href="/activity-logs"
              style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}
            >
              View all notifications →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
