'use client';

import React, { useState, useMemo } from 'react';
import { Clock, Calendar, ChevronRight } from 'lucide-react';
import { TimelineEvent } from '../types';

interface ProjectTimelineProps {
  events: TimelineEvent[];
}

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ events = [] }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedCategory === 'all') return true;
      return e.category?.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [events, selectedCategory]);

  const getRelativeTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      if (diffMs < 0) return 'Just now';
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return '';
    } catch {
      return '';
    }
  };

  // Group events by date: (date... under that date all events with timestamp)
  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    filteredEvents.forEach((evt) => {
      const timeVal = evt.created_at || evt.timestamp;
      const dateLabel = timeVal
        ? new Date(timeVal).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : 'Recent Events';
      if (!groups[dateLabel]) groups[dateLabel] = [];
      groups[dateLabel].push(evt);
    });
    return groups;
  }, [filteredEvents]);

  if (events.length === 0) {
    return (
      <div
        style={{
          padding: '2.5rem',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e4e4e7',
          color: '#71717a',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.85rem' }}>
          No audit timeline events logged yet for this project.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['all', 'request', 'planning', 'approval', 'allocation', 'execution', 'payment'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: selectedCategory === cat ? '#09090b' : '#e4e4e7',
              backgroundColor: selectedCategory === cat ? '#09090b' : '#ffffff',
              color: selectedCategory === cat ? '#ffffff' : '#71717a',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Date-Grouped Timeline Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {Object.entries(groupedEvents).map(([dateLabel, items]) => (
          <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Date Header: (date... under that date all events with timestamp) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  padding: '0.28rem 0.75rem',
                  borderRadius: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <Calendar size={13} color="#ffffff" />
                <span>{dateLabel}</span>
              </div>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e4e4e7' }} />
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#71717a',
                  fontWeight: 600,
                  backgroundColor: '#f4f4f5',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  border: '1px solid #e4e4e7',
                }}
              >
                {items.length} {items.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {/* Under that Date: Events Stream with Redesigned Timestamp Area */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                padding: '1.15rem 1.35rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              {items.map((event, idx) => {
                const timeVal = event.created_at || event.timestamp;
                const formattedTime = timeVal
                  ? new Date(timeVal).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : '—';
                const relTime = getRelativeTime(timeVal);
                const isLast = idx === items.length - 1;
                const title = event.title || event.action?.replace(/_/g, ' ').toUpperCase() || 'Event Logged';

                return (
                  <div
                    key={event.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '110px 24px 1fr',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      position: 'relative',
                    }}
                  >
                    {/* ── Redesigned Timestamp Area ── */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        paddingTop: '2px',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.22rem 0.5rem',
                          backgroundColor: '#f4f4f5',
                          border: '1px solid #e4e4e7',
                          borderRadius: '6px',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          color: '#09090b',
                          letterSpacing: '0.2px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Clock size={11} color="#71717a" />
                        <span>{formattedTime}</span>
                      </div>

                      {relTime && (
                        <span
                          style={{
                            fontSize: '0.675rem',
                            color: '#a1a1aa',
                            fontWeight: 500,
                            marginTop: '2px',
                            paddingRight: '2px',
                          }}
                        >
                          {relTime}
                        </span>
                      )}
                    </div>

                    {/* ── Timeline Axis Node & Connecting Line ── */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        position: 'relative',
                      }}
                    >
                      {/* Node Dot */}
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#09090b',
                          border: '2px solid #ffffff',
                          boxShadow: '0 0 0 2px #d4d4d8',
                          zIndex: 2,
                          marginTop: '7px',
                          flexShrink: 0,
                        }}
                      />

                      {/* Connecting Track Line */}
                      {!isLast && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '16px',
                            bottom: '0',
                            width: '2px',
                            backgroundColor: '#e4e4e7',
                            zIndex: 1,
                          }}
                        />
                      )}
                    </div>

                    {/* ── Event Details (Just Event!) ── */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.2rem',
                        paddingBottom: isLast ? '0.25rem' : '1.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#09090b' }}>
                          {title}
                        </span>
                        {event.category && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '3px',
                              backgroundColor: '#f4f4f5',
                              color: '#71717a',
                              border: '1px solid #e4e4e7',
                            }}
                          >
                            {event.category}
                          </span>
                        )}
                      </div>

                      {event.message && (
                        <p
                          style={{
                            fontSize: '0.8rem',
                            color: '#52525b',
                            margin: 0,
                            lineHeight: 1.45,
                          }}
                        >
                          {event.message}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
