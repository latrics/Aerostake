'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Clock, ShieldCheck, FileText, ChevronRight, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  link?: string;
  type: 'project' | 'planning' | 'system';
}

export function NotificationButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '6px',
          backgroundColor: isOpen ? '#f4f4f5' : '#ffffff',
          border: '1px solid #e4e4e7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.15s ease',
          padding: 0,
        }}
        title="Notifications"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f4f4f5';
          e.currentTarget.style.borderColor = '#d4d4d8';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#e4e4e7';
          }
        }}
      >
        <Bell size={16} color="#09090b" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: '7px',
              width: '6px',
              height: '6px',
              backgroundColor: '#09090b',
              borderRadius: '50%',
              boxShadow: '0 0 0 1.5px #ffffff',
            }}
          />
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '320px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #f4f4f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.4rem',
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    borderRadius: '10px',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#09090b')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#a1a1aa', fontSize: '0.8rem' }}>
                No notifications right now
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #f4f4f5',
                    backgroundColor: item.read ? '#ffffff' : '#fafafa',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: item.read ? 600 : 700, color: '#09090b', lineHeight: 1.3 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#52525b', marginTop: '0.2rem', lineHeight: 1.4 }}>
                        {item.description}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#a1a1aa', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} />
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                    {!item.read && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#09090b',
                          flexShrink: 0,
                          marginTop: '4px',
                        }}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
