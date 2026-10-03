import React, { useState } from 'react';
import Link from 'next/link';
import {
  Folder,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  CreditCard,
  Send,
  Save,
  Check,
  Star,
} from 'lucide-react';
import { ClientCompany } from '../types';

interface ClientExpandedRowProps {
  company: ClientCompany;
  onUpdateRemarks?: (companyId: string, newRemarks: string) => void;
  onUpdateRating?: (companyId: string, newRating: number) => void;
}

export const ClientExpandedRow: React.FC<ClientExpandedRowProps> = ({
  company,
  onUpdateRemarks,
  onUpdateRating,
}) => {
  const [remarkText, setRemarkText] = useState(company.remarks || '');
  const [rating, setRating] = useState(company.rating || 5.0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [ratingSavedNotice, setRatingSavedNotice] = useState(false);

  const handleSaveRemarks = () => {
    if (onUpdateRemarks) {
      onUpdateRemarks(company.id, remarkText);
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleSaveRating = (valToSave?: number) => {
    const targetRating = valToSave !== undefined ? valToSave : rating;
    if (onUpdateRating) {
      onUpdateRating(company.id, targetRating);
    }
    setRatingSavedNotice(true);
    setTimeout(() => setRatingSavedNotice(false), 2000);
  };

  const handleStarClick = (starVal: number) => {
    setRating(starVal);
    handleSaveRating(starVal);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'capturing':
        return { bg: '#18181b', color: '#ffffff', border: '#18181b', label: 'Capturing' };
      case 'planning':
      case 'submitted':
        return { bg: '#f4f4f5', color: '#09090b', border: '#e4e4e7', label: 'Planning' };
      case 'completed':
        return { bg: '#09090b', color: '#ffffff', border: '#09090b', label: 'Completed' };
      default:
        return { bg: '#fafafa', color: '#52525b', border: '#e4e4e7', label: status };
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#fafafa',
        borderTop: '1px dashed #e4e4e7',
        borderBottom: '1px solid #e4e4e7',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(260px, 1fr) minmax(240px, 1fr)',
          gap: '1.5rem',
        }}
      >
        {/* Column 1: Client Projects */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f4f4f5',
              paddingBottom: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Folder size={16} color="#09090b" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                Active Projects ({company.projects?.length || company.projects_count})
              </span>
            </div>
            <Link
              href="/projects"
              style={{
                fontSize: '0.75rem',
                color: '#09090b',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontWeight: 600,
              }}
            >
              All Projects <ExternalLink size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {company.projects && company.projects.length > 0 ? (
              company.projects.map((proj) => {
                const badge = getStatusBadge(proj.status);
                const progressPct =
                  proj.sectors_count > 0
                    ? Math.round((proj.completed_sectors_count / proj.sectors_count) * 100)
                    : 0;

                return (
                  <div
                    key={proj.id}
                    style={{
                      border: '1px solid #f4f4f5',
                      borderRadius: '6px',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#fbfbfb',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          color: '#09090b',
                        }}
                      >
                        {proj.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '12px',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: '#71717a',
                      }}
                    >
                      <span>
                        Sectors: {proj.completed_sectors_count}/{proj.sectors_count} ({progressPct}%)
                      </span>
                      <span>{proj.location || 'Site A'}</span>
                    </div>

                    {/* Mini progress bar */}
                    <div
                      style={{
                        marginTop: '0.35rem',
                        height: '4px',
                        backgroundColor: '#e4e4e7',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPct}%`,
                          backgroundColor: '#09090b',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#71717a', padding: '0.5rem 0' }}>
                No active projects registered for this client.
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Key Contact & Company Info */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderBottom: '1px solid #f4f4f5',
              paddingBottom: '0.5rem',
            }}
          >
            <User size={16} color="#09090b" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
              Primary Client Representative
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#09090b' }}>
              {company.contact_name || 'Designated Client POC'}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#52525b',
              }}
            >
              <Mail size={14} color="#71717a" />
              <span>{company.contact_email || 'client@company.com'}</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#52525b',
              }}
            >
              <Phone size={14} color="#71717a" />
              <span>{company.contact_phone || '+91 (Operational Line)'}</span>
            </div>
            {company.address && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#52525b',
                  marginTop: '0.25rem',
                }}
              >
                <MapPin size={14} color="#71717a" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{company.address}</span>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 'auto',
              paddingTop: '0.75rem',
              borderTop: '1px solid #f4f4f5',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <Link
              href={`mailto:${company.contact_email || 'client@latrics.com'}`}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                backgroundColor: '#f4f4f5',
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#09090b',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <Mail size={13} /> Email POC
            </Link>
            <Link
              href="/payments"
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                backgroundColor: '#f4f4f5',
                border: '1px solid #e4e4e7',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#09090b',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <CreditCard size={13} /> Invoices
            </Link>
          </div>
        </div>

        {/* Column 3: Ops Notes, Remarks & Rating */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f4f4f5',
              paddingBottom: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={16} color="#09090b" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                Operational Remarks &amp; Rating
              </span>
            </div>
            {savedNotice && (
              <span
                style={{
                  fontSize: '0.725rem',
                  color: '#09090b',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <Check size={12} /> Remarks Saved
              </span>
            )}
          </div>

          {/* Interactive Rating Component */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.65rem',
              backgroundColor: '#fafafa',
              border: '1px solid #e4e4e7',
              borderRadius: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
                Rating:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                {[1, 2, 3, 4, 5].map((s) => {
                  const activeStar = (hoverRating !== null ? hoverRating : Math.round(rating)) >= s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStarClick(s)}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(null)}
                      title={`Rate ${s}.0 Stars`}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '1px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Star
                        size={17}
                        fill={activeStar ? '#09090b' : '#e4e4e7'}
                        color={activeStar ? '#09090b' : '#d4d4d8'}
                      />
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                min="1.0"
                max="5.0"
                step="0.1"
                value={rating}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setRating(Math.max(1, Math.min(5, Math.round(val * 10) / 10)));
                  }
                }}
                style={{
                  width: '46px',
                  padding: '0.2rem 0.35rem',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: '1px solid #d4d4d8',
                  textAlign: 'center',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a' }}>/ 5.0</span>
            </div>

            <button
              type="button"
              onClick={() => handleSaveRating()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.3rem 0.65rem',
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '5px',
                fontSize: '0.725rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              {ratingSavedNotice ? (
                <>
                  <Check size={11} /> Saved
                </>
              ) : (
                'Set Rating'
              )}
            </button>
          </div>

          <p style={{ fontSize: '0.725rem', color: '#71717a', margin: '0.1rem 0 0 0' }}>
            Internal notes and rating maintained by LATRICS Ops and Admin team for this client company.
          </p>

          <textarea
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Add operational notes or compliance remarks..."
            rows={3}
            style={{
              width: '100%',
              fontSize: '0.8rem',
              padding: '0.5rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid #d4d4d8',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
            <button
              onClick={handleSaveRemarks}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                backgroundColor: '#09090b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Save size={13} /> Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
