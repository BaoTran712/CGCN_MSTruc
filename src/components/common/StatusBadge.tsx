import React from 'react';
import { ApplicationStatus } from '../../types';
import { getStatusMeta } from '../../utils/statusHelpers';

interface StatusBadgeProps {
  status: ApplicationStatus;
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showDot = true,
  className = '',
}) => {
  const meta = getStatusMeta(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap ${meta.badgeClass} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotClass}`}
          aria-hidden="true"
        />
      )}
      <span>{meta.label}</span>
    </span>
  );
};
