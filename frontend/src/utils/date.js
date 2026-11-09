/**
 * Universal UTC Date & Time formatting utilities for CareerBridge.
 * Ensures timestamps emitted from SQLite/FastAPI (which may lack explicit 'Z')
 * are correctly parsed as UTC and displayed accurately in the client's local timezone (e.g. IST).
 */

export function parseUTCDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  let s = String(dateStr).trim();
  // If the date string lacks timezone offset (no Z and no +/- offset at the end), treat as UTC
  if (!s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatTimeAgo(dateStr) {
  const date = parseUTCDate(dateStr);
  if (!date) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  // If created recently (or minor clock drift between client and server), show 'Just now'
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr, options = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) {
  const date = parseUTCDate(dateStr);
  if (!date) return '';
  return date.toLocaleDateString('en-US', options);
}

export function formatTimeString(dateStr) {
  const date = parseUTCDate(dateStr);
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
