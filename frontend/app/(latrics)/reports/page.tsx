'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, FileText, ArrowLeft, ArrowRight, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { projectApi } from '@/modules/projects/api';
import { Project } from '@/modules/projects/types';
import { PageHeader } from '@/components/PageHeader';

export default function PilotReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const list = await projectApi.listProjects().catch(() => []);
        setProjects(list || []);
      } catch (err) {
        console.error('Failed to load projects for reports:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const reportedProjects = projects.filter((p) => (p.completed_sectors || 0) > 0 || p.status === 'completed');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <PageHeader
        title="Flight & Mission Reports"
        subtitle="Completed flight logs, daily capture reports, and pilot telemetry records."
        breadcrumbs={
          <Link href="/dashboard" style={{ color: '#71717a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
        }
      >
        <Link
          href="/projects"
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            backgroundColor: '#ffffff',
            border: '1px solid #d4d4d8',
            color: '#09090b',
            borderRadius: '6px',
            textDecoration: 'none',
          }}
        >
          <span>View All Projects</span>
          <ArrowRight size={14} />
        </Link>
      </PageHeader>

      {/* Reports Table Card */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid #f4f4f5', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="#09090b" />
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b' }}>
              Mission Log Reports
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a' }}>
            {reportedProjects.length} {reportedProjects.length === 1 ? 'Report' : 'Reports'} Filed
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#71717a' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            <span style={{ fontSize: '0.8rem' }}>Loading flight reports...</span>
          </div>
        ) : reportedProjects.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#71717a' }}>
            <BarChart3 size={32} color="#a1a1aa" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b', margin: 0 }}>No flight reports filed yet</p>
            <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
              When flight missions conclude and daily capture logs are submitted to Operations, they will be archived here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f4f4f5', color: '#71717a', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Project Title</th>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Location</th>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Progress</th>
                  <th style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reportedProjects.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, color: '#09090b' }}>
                      {p.title}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', color: '#52525b' }}>
                      {p.survey_location || 'Field Site'}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span style={{ fontSize: '0.675rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f4f4f5', color: '#09090b', textTransform: 'capitalize' }}>
                        {p.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600, color: '#09090b' }}>
                      {p.progress_pct || 0}%
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <Link href={`/projects/${p.id}/overview`} style={{ color: '#09090b', fontWeight: 600, textDecoration: 'none' }}>
                        View Overview →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
