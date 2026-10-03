'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, Clock, CheckCircle2, ArrowLeft, Layers, Loader2 } from 'lucide-react';
import { projectApi } from '@/modules/projects/api';
import { Project } from '@/modules/projects/types';
import { PageHeader } from '@/components/PageHeader';

export default function PilotSchedulePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const list = await projectApi.listProjects().catch(() => []);
        setProjects(list || []);
      } catch (err) {
        console.error('Failed to load projects for schedule:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const activeProjects = projects.filter((p) =>
    ['in_progress', 'capturing', 'mobilising', 'approved'].includes((p.status || '').toLowerCase())
  );

  const scheduleSlots = activeProjects.flatMap((p) => [
    {
      time: '08:00 - 09:00',
      title: 'Site Mobilisation & Weather Assessment',
      project: p.title,
      location: p.survey_location || 'Field Site',
      status: 'In Progress',
      notes: 'Pre-flight checks, airspace advisory verification, and sensor calibration.',
    },
    {
      time: '09:30 - 12:30',
      title: 'Autonomous Flight Mission - Data Capture',
      project: p.title,
      location: p.survey_location || 'Sector 1',
      status: 'Pending',
      notes: 'Primary flight lines and boundary overlap capture.',
    },
    {
      time: '14:00 - 15:30',
      title: 'Field Data Verification & Telemetry Sync',
      project: p.title,
      location: 'Field Base',
      status: 'Pending',
      notes: 'Checksum verification, raw image backup, and flight log transmission to Ops.',
    },
  ]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <PageHeader
        title="Pilot Flight Schedule"
        subtitle="Daily flight slots, sector mobilisation timings, and field reporting schedule."
        breadcrumbs={
          <Link href="/dashboard" style={{ color: '#71717a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
        }
      >
        <Link
          href="/projects"
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            padding: '0.5rem 1rem',
            backgroundColor: '#09090b',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
          }}
        >
          <Layers size={14} />
          <span>My Flight Assignments</span>
        </Link>
      </PageHeader>

      {/* Schedule Slots Timeline */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid #f4f4f5', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={18} color="#09090b" />
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#09090b' }}>
              Today&apos;s Missions
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a' }}>
            {scheduleSlots.length} {scheduleSlots.length === 1 ? 'Slot' : 'Slots'} Scheduled
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#71717a' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            <span style={{ fontSize: '0.8rem' }}>Loading active mission schedules...</span>
          </div>
        ) : scheduleSlots.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#71717a' }}>
            <Clock size={32} color="#a1a1aa" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b', margin: 0 }}>No flight schedules for today</p>
            <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
              When survey projects are approved and dispatched for flight capture, your timeline will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {scheduleSlots.map((slot, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: slot.status === 'In Progress' ? '#fafafa' : '#ffffff',
                  border: '1px solid #e4e4e7',
                }}
              >
                <div style={{ minWidth: '95px' }}>
                  <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} color="#71717a" />
                    <span>{slot.time}</span>
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: '0.4rem',
                      fontSize: '0.675rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: slot.status === 'In Progress' ? '#09090b' : '#f4f4f5',
                      color: slot.status === 'In Progress' ? '#ffffff' : '#52525b',
                    }}
                  >
                    {slot.status}
                  </span>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#09090b' }}>
                    {slot.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.2rem' }}>
                    Project: <span style={{ fontWeight: 600, color: '#09090b' }}>{slot.project}</span> · Location: {slot.location}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#52525b', marginTop: '0.35rem', backgroundColor: '#f4f4f5', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                    {slot.notes}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
