import React, { useState, useEffect, useRef } from 'react';
import {
  Settings2,
  Plus,
  Trash2,
  Check,
  Building2,
  UserCheck,
  ChevronDown,
  Edit3,
  X,
  RotateCcw,
  List,
} from 'lucide-react';
import { Dossier, SignatureConfig } from '../../types';

interface SignatureConfigPanelProps {
  dossier: Dossier;
  onSaveConfig: (config: SignatureConfig) => void;
  readOnly?: boolean;
}

const AVAILABLE_DEPARTMENTS = [
  'Phòng KH&CN',
  'Phòng TCKT',
  'Phòng Đào tạo',
  'Phòng TCCB',
  'TTDV&ĐTTNCXH',
  'Văn Phòng Trường',
  'Phòng Sau Đại học',
  'Khoa Y',
  'Khoa Dược',
  'Khoa Răng Hàm Mặt',
  'Khoa Y tế Công cộng',
];

export const SignatureConfigPanel: React.FC<SignatureConfigPanelProps> = ({
  dossier,
  onSaveConfig,
  readOnly = false,
}) => {
  const currentConfig: SignatureConfig = dossier.signature_config || dossier.signatureConfig || {
    departments: ['Phòng KH&CN', 'Phòng TCKT'],
    rectorRole: 'HIỆU TRƯỞNG',
    rectorSignerName: '',
    recipients: [
      `- Như kính gửi (${dossier.department_name || dossier.createdBy?.department || 'Khoa Y'});`,
      '- TCKT;',
      '- TTDV&ĐTTNCXH;',
      '- Lưu: VT, KHCN.',
    ],
    unitRecipient: dossier.department_name || dossier.createdBy?.department || 'Khoa Y',
  };

  const [departments, setDepartments] = useState<string[]>(
    currentConfig.departments || ['Phòng KH&CN', 'Phòng TCKT']
  );
  const [rectorRole, setRectorRole] = useState<string>(currentConfig.rectorRole || 'HIỆU TRƯỞNG');
  const [rectorSignerName, setRectorSignerName] = useState<string>(currentConfig.rectorSignerName || '');
  const [recipients, setRecipients] = useState<string[]>(
    currentConfig.recipients || [
      `- Như kính gửi (${dossier.department_name || dossier.createdBy?.department || 'Khoa Y'});`,
      '- TCKT;',
      '- TTDV&ĐTTNCXH;',
      '- Lưu: VT, KHCN.',
    ]
  );

  // Department Dropdown state
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState<boolean>(false);
  const [customDeptInput, setCustomDeptInput] = useState<string>('');
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  // Recipients Modal state
  const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState<boolean>(false);
  const [isTextareaMode, setIsTextareaMode] = useState<boolean>(false);
  const [rawRecipientsText, setRawRecipientsText] = useState<string>('');

  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (dossier.signature_config || dossier.signatureConfig) {
      const cfg = dossier.signature_config || dossier.signatureConfig!;
      setDepartments(cfg.departments || ['Phòng KH&CN', 'Phòng TCKT']);
      setRectorRole(cfg.rectorRole || 'HIỆU TRƯỞNG');
      setRectorSignerName(cfg.rectorSignerName || '');
      if (cfg.recipients) setRecipients(cfg.recipients);
    }
  }, [dossier]);

  // Click outside to close department dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target as Node)) {
        setIsDeptDropdownOpen(false);
      }
    };
    if (isDeptDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDeptDropdownOpen]);

  // Toggle department and auto-sync TCKT in Nơi nhận
  const handleToggleDepartment = (deptName: string) => {
    if (readOnly) return;
    let nextDepts: string[];
    if (departments.includes(deptName)) {
      nextDepts = departments.filter((d) => d !== deptName);
    } else {
      nextDepts = [...departments, deptName];
    }
    setDepartments(nextDepts);

    // Tự động đồng bộ Nơi nhận theo quy định mục 3.2
    if (deptName === 'Phòng TCKT') {
      if (!nextDepts.includes('Phòng TCKT')) {
        setRecipients((prev) => prev.filter((r) => !r.toUpperCase().includes('TCKT')));
      } else {
        setRecipients((prev) => {
          if (prev.some((r) => r.toUpperCase().includes('TCKT'))) return prev;
          const inserted = [...prev];
          const insertIdx = Math.max(1, inserted.length - 2);
          inserted.splice(insertIdx, 0, '- TCKT;');
          return inserted;
        });
      }
    }
    setIsSaved(false);
  };

  const handleAddCustomDepartment = () => {
    if (readOnly) return;
    const clean = customDeptInput.trim();
    if (!clean) return;
    if (!departments.includes(clean)) {
      setDepartments((prev) => [...prev, clean]);
      setCustomDeptInput('');
      setIsSaved(false);
    }
  };

  const handleRemoveDepartment = (deptName: string) => {
    if (readOnly) return;
    setDepartments((prev) => prev.filter((d) => d !== deptName));
    if (deptName === 'Phòng TCKT') {
      setRecipients((prev) => prev.filter((r) => !r.toUpperCase().includes('TCKT')));
    }
    setIsSaved(false);
  };

  const handleRecipientChange = (index: number, val: string) => {
    if (readOnly) return;
    setRecipients((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
    setIsSaved(false);
  };

  const handleAddRecipient = () => {
    if (readOnly) return;
    setRecipients((prev) => [...prev, '- ...;']);
    setIsSaved(false);
  };

  const handleRemoveRecipient = (index: number) => {
    if (readOnly) return;
    setRecipients((prev) => prev.filter((_, i) => i !== index));
    setIsSaved(false);
  };

  const handleOpenRecipientsModal = () => {
    setRawRecipientsText(recipients.join('\n'));
    setIsRecipientsModalOpen(true);
  };

  const handleApplyRecipientsFromModal = () => {
    if (isTextareaMode) {
      const lines = rawRecipientsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => (l.startsWith('-') ? l : `- ${l}`));
      setRecipients(lines);
    }
    setIsRecipientsModalOpen(false);
    setIsSaved(false);
  };

  const handleResetDefaultRecipients = () => {
    const defaultList = [
      `- Như kính gửi (${dossier.department_name || dossier.createdBy?.department || 'Khoa Y'});`,
      ...(departments.includes('Phòng TCKT') ? ['- TCKT;'] : []),
      '- TTDV&ĐTTNCXH;',
      '- Lưu: VT, KHCN.',
    ];
    setRecipients(defaultList);
    setRawRecipientsText(defaultList.join('\n'));
    setIsSaved(false);
  };

  const handleSave = () => {
    const config: SignatureConfig = {
      departments,
      rectorRole,
      rectorSignerName: rectorSignerName.trim(),
      recipients: recipients.filter((r) => r.trim() !== ''),
      unitRecipient: dossier.department_name || dossier.createdBy?.department || 'Khoa Y',
    };
    onSaveConfig(config);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3.5">
      {/* Header gọn gàng của Card duy nhất */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-900">
            Tùy chỉnh thành phần ký &amp; Nơi nhận (Admin)
          </h2>
          <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
            • Chuẩn Nghị định 30
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <Check className="w-3 h-3" />
              Đã áp dụng
            </span>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu cấu hình</span>
            </button>
          )}
        </div>
      </div>

      {/* Dàn trang theo các hàng ngang (Horizontal Layout) trong 1 Card duy nhất */}
      <div className="divide-y divide-slate-100 space-y-3 pt-0.5">
        {/* =====================================================================
            HÀNG 1: PHÒNG BAN KÝ (BẢNG 1) - MULTI-SELECT DROPDOWN + TAGS
        ===================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2.5 first:pt-0">
          <div className="sm:w-36 shrink-0 flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Phòng ban ký:</span>
          </div>

          <div className="flex-1 flex flex-wrap items-center gap-1.5">
            {departments.map((dept) => (
              <span
                key={dept}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs"
              >
                <span>{dept}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDepartment(dept)}
                    className="hover:text-rose-600 text-blue-400 p-0.5 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                    title={`Xóa ${dept}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}

            {departments.length === 0 && (
              <span className="text-xs text-slate-400 italic">
                (Chưa chọn phòng ban nào)
              </span>
            )}

            {/* Dropdown Multi-select Button & Popup */}
            {!readOnly && (
              <div className="relative inline-block" ref={deptDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-md transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Chọn phòng ban</span>
                  <ChevronDown className="w-3 h-3 text-blue-500" />
                </button>

                {isDeptDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2.5 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                      Danh mục phòng ban duyệt:
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
                      {AVAILABLE_DEPARTMENTS.map((dept) => {
                        const isSelected = departments.includes(dept);
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => handleToggleDepartment(dept)}
                            className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-md text-left flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 text-blue-800 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span>{dept}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Thêm đơn vị tùy ý */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={customDeptInput}
                          onChange={(e) => setCustomDeptInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomDepartment();
                            }
                          }}
                          placeholder="Đơn vị khác..."
                          className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomDepartment}
                          className="px-2 py-1 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded cursor-pointer"
                        >
                          Thêm
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
            HÀNG 2: CHỨC DANH BGH & NGƯỜI KÝ (BẢNG 2) - DROPDOWN + INPUT NGANG
        ===================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2.5">
          <div className="sm:w-36 shrink-0 flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Ban Giám hiệu:</span>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Dropdown chọn chức danh BGH */}
            <select
              value={rectorRole}
              onChange={(e) => {
                setRectorRole(e.target.value);
                setIsSaved(false);
              }}
              disabled={readOnly}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 sm:w-64 cursor-pointer text-slate-900"
            >
              <option value="HIỆU TRƯỞNG">HIỆU TRƯỞNG (Mặc định)</option>
              <option value="KT. HIỆU TRƯỞNG / PHÓ HIỆU TRƯỞNG">
                KT. HIỆU TRƯỞNG / PHÓ HIỆU TRƯỞNG
              </option>
            </select>

            {/* Ô nhập họ tên người ký BGH ngay bên phải */}
            <input
              type="text"
              value={rectorSignerName}
              onChange={(e) => {
                setRectorSignerName(e.target.value);
                setIsSaved(false);
              }}
              disabled={readOnly}
              placeholder="Họ tên người ký BGH (tùy chọn, vd: GS.TS. Nguyễn Trung Kiên)..."
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* =====================================================================
            HÀNG 3: NƠI NHẬN (BẢNG 2) - TAGS NGẮN GỌN + NÚT SỬA NƠI NHẬN
        ===================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2.5">
          <div className="sm:w-36 shrink-0 flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <List className="w-3.5 h-3.5 text-blue-600" />
            <span>Nơi nhận:</span>
          </div>

          <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
            {/* Danh sách nơi nhận dạng Tag ngắn gọn */}
            <div className="flex flex-wrap items-center gap-1.5">
              {recipients.map((rec, i) => (
                <span
                  key={i}
                  className="inline-block px-2 py-0.5 text-[11px] font-mono bg-slate-100 text-slate-700 rounded border border-slate-200"
                >
                  {rec}
                </span>
              ))}
            </div>

            {/* Nút sửa Nơi nhận bật Modal */}
            {!readOnly && (
              <button
                type="button"
                onClick={handleOpenRecipientsModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <Edit3 className="w-3 h-3 text-blue-600" />
                <span>Sửa nơi nhận</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODAL CHỈNH SỬA CHI TIẾT DANH SÁCH NƠI NHẬN
      ===================================================================== */}
      {isRecipientsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Chỉnh sửa Danh sách Nơi nhận (Bảng 2)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Danh sách gửi văn bản in ở góc dưới bên trái theo Nghị định 30
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecipientsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chuyển chế độ: Danh sách từng dòng vs Textarea */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsTextareaMode(false)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    !isTextareaMode ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Từng dòng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRawRecipientsText(recipients.join('\n'));
                    setIsTextareaMode(true);
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    isTextareaMode ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Dạng văn bản
                </button>
              </div>

              {/* Gợi ý thêm nhanh */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400">Gợi ý:</span>
                {['TCKT', 'TTDV&ĐTTNCXH', 'Lưu: VT, KHCN'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      const item = `- ${chip};`;
                      if (!recipients.includes(item)) {
                        setRecipients([...recipients, item]);
                      }
                    }}
                    className="text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-1.5 py-0.5 rounded border border-slate-200"
                  >
                    +{chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Nội dung danh sách */}
            {!isTextareaMode ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {recipients.map((rec, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400 w-5 text-right">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={rec}
                      onChange={(e) => handleRecipientChange(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                      placeholder="- Đơn vị nhận..."
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Xóa dòng này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddRecipient}
                  className="w-full py-1.5 text-xs font-semibold text-blue-700 border border-dashed border-blue-300 hover:bg-blue-50/50 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dòng mới</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <textarea
                  rows={7}
                  value={rawRecipientsText}
                  onChange={(e) => setRawRecipientsText(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="- Như kính gửi;&#10;- TCKT;&#10;- TTDV&ĐTTNCXH;&#10;- Lưu: VT, KHCN."
                />
                <p className="text-[11px] text-slate-500">Mỗi dòng là một nơi nhận.</p>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetDefaultRecipients}
                className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại mặc định</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecipientsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleApplyRecipientsFromModal}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
