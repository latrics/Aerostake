import React, { useState } from 'react';
import { TimelineEvent } from '../types';

interface ProjectTimelineProps {
  events: TimelineEvent[];
}

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ events }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredEvents = events.filter((e) => {
    if (selectedCategory === 'all') return true;
    return e.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'request':
        return '#3b82f6';
      case 'planning':
        return '#8b5cf6';
      case 'approval':
        return '#10b981';
      case 'allocation':
        return '#f59e0b';
      case 'execution':
        return '#06b6d4';
      case 'payment':
        return '#10b981';
      default:
        return '#9ca3af';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'request':
        return '📋';
      case 'planning':
        return '📐';
      case 'approval':
        return '✓';
      case 'allocation':
        return '🚁';
      case 'execution':
        return '⚡';
      case 'payment':
        return '💳';
      default:
        return '📌';
    }
  };

  if (events.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>
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
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: selectedCategory === cat ? '#3b82f6' : 'var(--border-color)',
              backgroundColor: selectedCategory === cat ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
              color: selectedCategory === cat ? '#3b82f6' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Timeline Stream */}
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
          {/* Vertical Connecting Guide Line */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              left: '19px',
              width: '2px',
              backgroundColor: 'var(--border-color)',
              zIndex: 0,
            }}
          />

          {filteredEvents.map((event) => {
            const eventColor = getCategoryColor(event.category);
            const icon = getCategoryIcon(event.category);
            const formattedTime = new Date(event.timestamp).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={event.id}
                style={{
                  display: 'flex',
                  gap: '1.25rem',
                  position: 'relative',
                  zIndex: 1,
                  alignItems: 'flex-start',
                }}
              >
                {/* Node icon circle */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-secondary)',
                    border: `2px solid ${eventColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    flexShrink: 0,
                    boxShadow: `0 0 10px ${eventColor}33`,
                  }}
                >
                  {icon}
                </div>

                {/* Event details card */}
                <div
                  className="glass-card"
                  style={{
                    flex: 1,
                    padding: '1rem 1.25rem',
                    backgroundColor: 'rgba(18, 22, 32, 0.6)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: `${eventColor}22`,
                          color: eventColor,
                          border: `1px solid ${eventColor}44`,
                        }}
                      >
                        {event.category}
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {event.action.replace(/_/g, ' ').toUpperCase()}
                      </strong>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formattedTime}
                    </span>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: event.metadata_payload && Object.keys(event.metadata_payload).length > 0 ? '0.75rem' : 0 }}>
                    {event.message}
                  </p>

                  {event.metadata_payload && Object.keys(event.metadata_payload).length > 0 && (
                    <div
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-color)',
                        fontFamily: 'monospace',
                        overflowX: 'auto',
                      }}
                    >
                      {JSON.stringify(event.metadata_payload)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
