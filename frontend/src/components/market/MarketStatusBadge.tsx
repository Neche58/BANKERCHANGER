// ============================================================
// BANKERCHANGER — MarketStatusBadge Component
// ============================================================

import type { MarketStatus } from '../../types';

interface MarketStatusBadgeProps {
  status: MarketStatus;
}

/**
 * Small pill-shaped badge indicating market status.
 *
 * Color mapping:
 *   open       → green
 *   locked     → yellow / amber
 *   resolved   → blue
 *   cancelled  → gray
 *   disputed   → red
 *
 * Text: capitalize the status string (e.g. "Open", "Locked").
 */
export function MarketStatusBadge({ status }: MarketStatusBadgeProps): JSX.Element {
  const colors: Record<typeof status, string> = {
    open:      'bg-green-100 text-green-800',
    locked:    'bg-amber-100 text-amber-800',
    resolved:  'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-800',
    disputed:  'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
