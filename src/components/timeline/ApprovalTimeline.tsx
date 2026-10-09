import React from 'react';
import { TimelineEvent, ApplicationStatus } from '../../types';

interface ApprovalTimelineProps {
  events: TimelineEvent[];
  currentStatus: ApplicationStatus;
  className?: string;
}

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({
  events,
  currentStatus,
  className = '',
}) => {
  return (
    <div className={`space-y-0 ${className}`}>
      <div className="relative pl-4 border-l border-gray-300 ml-2 space-y-4 py-2">
        {events.map((evt, idx) => {
          const isLatest = idx === events.length - 1;

          return (
            <div key={evt.id || idx} className="relative group">
              {/* Timeline marker node (flat square dot) */}
              <div
                className={`absolute -left-[21px] top-1.5 w-2 h-2 bg-white border ${
                  isLatest ? 'border-blue-600 bg-blue-600' : 'border-gray-400'
                }`}
              />

              {/* Event Content */}
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className={`text-xs font-bold ${isLatest ? 'text-blue-700' : 'text-gray-800'}`}>
                    {evt.title}
                  </h4>
                  <span className="text-[10px] text-gray-500">{evt.timestamp}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="font-semibold">{evt.actor}</span>
                  <span aria-hidden="true">-</span>
                  <span>{evt.role}</span>
                </div>

                {evt.description && (
                  <p className="text-xs text-gray-700 mt-1">
                    {evt.description}
                  </p>
                )}

                {/* Manager Comments / Review remarks (flat quote style) */}
                {evt.comment && (
                  <div className="mt-2 pl-3 border-l-2 border-gray-400 bg-gray-50 py-1.5 pr-2 text-xs text-gray-800">
                    <span className="font-bold text-gray-700 block mb-0.5">Phản hồi:</span>
                    <p className="italic">"{evt.comment}"</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
