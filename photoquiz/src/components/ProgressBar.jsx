import React from 'react';

/**
 * ProgressBar
 * A thin animated progress bar.
 *
 * @param {{ value: number, color?: string, height?: number }} props
 *   value  — 0 to 100
 *   color  — CSS color string (default: var(--accent))
 *   height — bar height in px (default: 6)
 */
export default function ProgressBar({ value, color = 'var(--accent)', height = 6 }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        background: 'var(--surface2)',
        borderRadius: 99,
        height,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color,
          borderRadius: 99,
          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );
}
