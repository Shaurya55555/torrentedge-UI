/**
 * TorrentEdge Design System
 * 
 * Principles:
 * - Minimal, functional, no-nonsense
 * - One accent color, used sparingly
 * - Lots of grays, subtle borders
 * - Readable, not flashy
 */

export const colors = {
  // Backgrounds (darkest to lightest)
  bg: {
    primary: '#0a0a0a',    // Main background
    secondary: '#111111',   // Cards, elevated surfaces
    tertiary: '#191919',    // Hover states, inputs
    hover: '#1f1f1f',       // Hover on secondary
  },

  // Borders
  border: {
    subtle: '#1f1f1f',      // Default borders
    muted: '#2a2a2a',       // Slightly visible
    emphasis: '#333333',    // Active/focus states
  },

  // Text
  text: {
    primary: '#fafafa',     // Main text
    secondary: '#a0a0a0',   // Muted text, labels
    tertiary: '#666666',    // Disabled, hints
    inverse: '#0a0a0a',     // Text on accent
  },

  // Accent (one color, used sparingly)
  accent: {
    DEFAULT: '#3b82f6',     // Blue - links, primary actions
    hover: '#2563eb',       // Darker on hover
    muted: '#3b82f610',     // Very subtle background
  },

  // Semantic (use sparingly, only when meaning matters)
  semantic: {
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Status colors for torrents
  status: {
    downloading: '#3b82f6', // Blue
    seeding: '#22c55e',     // Green
    paused: '#666666',      // Gray
    error: '#ef4444',       // Red
    queued: '#a0a0a0',      // Light gray
    checking: '#eab308',    // Yellow
  },
};

export const typography = {
  // Font family
  family: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  },

  // Font sizes (rem)
  size: {
    xs: '0.75rem',    // 12px - tiny labels
    sm: '0.8125rem',  // 13px - secondary text
    base: '0.875rem', // 14px - body text (smaller than default)
    md: '1rem',       // 16px - emphasis
    lg: '1.125rem',   // 18px - section headers
    xl: '1.5rem',     // 24px - page titles
  },

  // Font weights
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
  },

  // Line heights
  leading: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const spacing = {
  // Base unit: 4px
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
};

export const radius = {
  none: '0',
  sm: '0.25rem',   // 4px - buttons, inputs
  md: '0.375rem',  // 6px - cards
  lg: '0.5rem',    // 8px - modals
  full: '9999px',  // Pills, avatars
};

export const shadows = {
  // Minimal shadows - mostly rely on borders
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
  md: '0 4px 12px rgba(0, 0, 0, 0.5)',
};

// Transitions
export const transitions = {
  fast: '100ms ease',
  normal: '150ms ease',
  slow: '250ms ease',
};
