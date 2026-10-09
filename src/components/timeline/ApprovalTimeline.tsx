import React from 'react';
import { Check, Clock, AlertCircle, Send, CheckCircle2, FileSignature, Edit3 } from 'lucide-react';
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
  const getEventIcon = (status: ApplicationStatus) => {
    switch (status) {
      case 'draft':
        return <Edit3 className="w-3.5 h-3.5 text-slate-500" />;
      case 'submitted':
      case 'resubmitted':
        return <Send className="w-3.5 h-3.5 text-blue-600" />;
      case 'under_review':
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case 'changes_requested':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-600" />;
      case 'approved':
        return <Check className="w-3.5 h-3.5 text-emerald-600" />;
      case 'for_signature':
        return <FileSignature className="w-3.5 h-3.5 text-sky-600" />;
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getEventBadgeColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'changes_requested':
        return 'bg-rose-100 border-rose-300 text-rose-700';
      case 'approved':
        return 'bg-emerald-100 border-emerald-300 text-emerald-800';
      case 'for_signature':
        return 'bg-sky-100 border-sky-300 text-sky-800';
      case 'completed':
        return 'bg-teal-100 border-teal-300 text-teal-800';
      case 'under_review':
        return 'bg-amber-100 border-amber-300 text-amber-800';
      default:
        return 'bg-slate-100 border-slate-300 text-slate-700';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {events.map((evt, idx) => {
          const isLatest = idx === events.length - 1;

          return (
            <div key={evt.id || idx} className="relative group">
              {/* Timeline marker node */}
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center bg-white ${getEventBadgeColor(
                  evt.status
                )} ${isLatest ? 'ring-2 ring-blue-500/20 shadow-sm' : ''}`}
              >
                {getEventIcon(evt.status)}
              </div>

              {/* Event Content */}
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-slate-900">{evt.title}</h4>
                  <span className="text-[11px] font-mono text-slate-500">{evt.timestamp}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{evt.actor}</span>
                  <span aria-hidden="true">·</span>
                  <span>{evt.role}</span>
                </div>

                {evt.description && (
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {evt.description}
                  </p>
                )}

                {/* Manager Comments / Review remarks */}
                {evt.comment && (
                  <div className="mt-2 p-2.5 rounded-md bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Ý kiến phản hồi / Nhận xét của Người quản lý:</span>
                    </div>
                    <p className="italic pl-5">"{evt.comment}"</p>
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
