import React, { useState } from 'react';
import {
  FileSignature,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Award,
  ExternalLink,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Application, User } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { normalizeStatus } from '../services/workflowEngine';

interface SecretaryViewProps {
  dossiers: Application[];
  currentUser: User;
  onInspectDossier: (dossier: Application) => void;
  onReceiveIntake?: (dossierId: string) => Promise<void>;
  onCompleteWithFinalDoc?: (dossierId: string, driveFileId: string) => Promise<void>;
}

export const SecretaryView: React.FC<SecretaryViewProps> = ({
  dossiers = [],
  currentUser,
  onInspectDossier,
}) => {
  const [activeTab, setActiveTab] = useState<'faculty_signed' | 'school_signing' | 'completed'>('faculty_signed');
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc chính xác theo quy trình ký số liên cấp mới
  const facultySignedList = dossiers.filter(
    (d) => normalizeStatus(d.status) === 'FACULTY_SIGNED'
  );

  const schoolSigningList = dossiers.filter(
    (d) => normalizeStatus(d.status) === 'SCHOOL_SIGNING'
  );

  const completedList = dossiers.filter(
    (d) => normalizeStatus(d.status) === 'COMPLETED'
  );

  const currentList =
    activeTab === 'faculty_signed'
      ? facultySignedList
      : activeTab === 'school_signing'
      ? schoolSigningList
      : completedList;

  const filtered = currentList.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      (d.code || '').toLowerCase().includes(q) ||
      (d.templateTitle || '').toLowerCase().includes(q) ||
      (d.title || '').toLowerCase().includes(q) ||
      (d.createdBy?.name || '').toLowerCase().includes(q) ||
      (d.createdBy?.department || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              PHÒNG KHOA HỌC CÔNG NGHỆ & BAN GIÁM HIỆU
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Điều phối Trình ký liên cấp & Ban hành Quyết định
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý hồ sơ đã hoàn thành ký số cấp Khoa, điều phối luồng thẩm định ký Trường và ban hành Quyết định CGCN chính thức
          </p>
        </div>

        {/* Counter Summary Badges */}
        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
            <span className="text-[10.5px] text-slate-500 block">Đã ký cấp Khoa</span>
            <span className="text-base font-bold font-mono text-amber-800">{facultySignedList.length}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
            <span className="text-[10.5px] text-slate-500 block">Đang ký Trường</span>
            <span className="text-base font-bold font-mono text-blue-800">{schoolSigningList.length}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
            <span className="text-[10.5px] text-slate-500 block">Đã ban hành QĐ</span>
            <span className="text-base font-bold font-mono text-emerald-800">{completedList.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Tabs Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã hồ sơ, tên cán bộ, đề tài..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
            />
          </div>

          {/* 3 Tab Điều phối */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('faculty_signed')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'faculty_signed'
                  ? 'bg-white text-amber-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSignature className="w-3.5 h-3.5 text-amber-600" />
              <span>1. Đã ký cấp Khoa ({facultySignedList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('school_signing')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'school_signing'
                  ? 'bg-white text-blue-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Đang ký cấp Trường ({schoolSigningList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'completed'
                  ? 'bg-white text-emerald-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. Đã ban hành QĐ ({completedList.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bảng Danh sách Hồ sơ Trình ký */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Mã hồ sơ</th>
                <th className="py-3 px-4">Tên đề tài & Biểu mẫu</th>
                <th className="py-3 px-4">Cán bộ đề nghị</th>
                <th className="py-3 px-4">Tiến độ ký số</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center text-slate-500">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800 text-sm">Không có hồ sơ nào trong mục này</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeTab === 'faculty_signed'
                        ? 'Chưa có hồ sơ nào nộp bản ký cấp Khoa.'
                        : activeTab === 'school_signing'
                        ? 'Không có hồ sơ nào đang trong luồng ký cấp Trường.'
                        : 'Chưa có hồ sơ nào ban hành Quyết định chính thức.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((dossier) => (
                  <tr key={dossier.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Code */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {dossier.code}
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-slate-900 truncate">
                        {dossier.title || dossier.templateTitle}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        {dossier.templateTitle}
                      </div>
                    </td>

                    {/* Creator */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{dossier.createdBy.name}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                        {dossier.createdBy.department}
                      </div>
                    </td>

                    {/* Signing Progress Indicators */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {activeTab === 'completed' ? (
                        <div className="text-[11px]">
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Số: {dossier.decision_number || '128/QĐ-ĐHYDCT'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              dossier.faculty_signed_pdf_url
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                            title="Chữ ký số Lãnh đạo Khoa"
                          >
                            Khoa {dossier.faculty_signed_pdf_url ? '✓' : '—'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              dossier.khcn_signed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                            title="Trưởng phòng Khoa học Công nghệ"
                          >
                            KHCN {dossier.khcn_signed ? '✓' : '—'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              dossier.bgh_signed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                            title="Ban Giám hiệu (Hiệu trưởng)"
                          >
                            BGH {dossier.bgh_signed ? '✓' : '—'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={dossier.status} />
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onInspectDossier(dossier)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg font-semibold transition-colors cursor-pointer"
                        title="Mở hồ sơ để điều phối ký số hoặc ban hành QĐ"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xử lý</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
