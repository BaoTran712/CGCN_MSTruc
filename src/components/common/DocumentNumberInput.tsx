import React, { useState, useEffect, useMemo } from 'react';
import { FileText } from 'lucide-react';

export const DEPARTMENT_ABBREVIATIONS: { name: string; abbr: string }[] = [
  // Phòng ban chức năng
  { name: 'Phòng Kế hoạch - Tài chính', abbr: 'KHTC' },
  { name: 'Phòng Kế hoạch Tài chính', abbr: 'KHTC' },
  { name: 'Phòng KHTC', abbr: 'KHTC' },
  { name: 'Kế hoạch - Tài chính', abbr: 'KHTC' },
  { name: 'Kế hoạch Tài chính', abbr: 'KHTC' },
  { name: 'Phòng Khoa học Công nghệ', abbr: 'KHCN' },
  { name: 'Phòng KH&CN', abbr: 'KHCN' },
  { name: 'Phòng KHCN', abbr: 'KHCN' },
  { name: 'Khoa học Công nghệ', abbr: 'KHCN' },
  { name: 'Phòng Đào tạo Đại học', abbr: 'ĐTĐH' },
  { name: 'Phòng Đào tạo Sau đại học', abbr: 'ĐTSĐH' },
  { name: 'Phòng Hành chính - Tổng hợp', abbr: 'HCTH' },
  { name: 'Phòng HCTH', abbr: 'HCTH' },
  { name: 'Phòng Công tác Sinh viên', abbr: 'CTSV' },
  { name: 'Phòng Quản trị - Thiết bị', abbr: 'QTTB' },
  { name: 'Phòng Hợp tác Quốc tế', abbr: 'HTQT' },
  { name: 'Phòng Khảo thí & Đảm bảo chất lượng', abbr: 'KT-ĐBCL' },
  { name: 'Phòng Tổ chức Cán bộ', abbr: 'TCCB' },

  // Khoa đào tạo
  { name: 'Khoa Công nghệ Thông tin', abbr: 'KCNTT' },
  { name: 'Khoa CNTT', abbr: 'KCNTT' },
  { name: 'Khoa Y', abbr: 'KY' },
  { name: 'Khoa Dược', abbr: 'KD' },
  { name: 'Khoa Răng Hàm Mặt', abbr: 'RHM' },
  { name: 'Khoa RHM', abbr: 'RHM' },
  { name: 'Khoa Y tế Công cộng', abbr: 'YTCC' },
  { name: 'Khoa YTCC', abbr: 'YTCC' },
  { name: 'Khoa Điều dưỡng và Kỹ thuật Y học', abbr: 'ĐD-KTYH' },
  { name: 'Khoa Điều dưỡng', abbr: 'ĐD' },
  { name: 'Khoa Khoa học Cơ bản', abbr: 'KHCB' },
  { name: 'Khoa KHCB', abbr: 'KHCB' },

  // Bệnh viện & Trung tâm
  { name: 'Bệnh viện Trường Đại học Y Dược Cần Thơ', abbr: 'BV' },
  { name: 'Bệnh viện Trường ĐHYD Cần Thơ', abbr: 'BV' },
  { name: 'Bệnh viện Trường', abbr: 'BV' },
  { name: 'Trung tâm Huấn luyện Kỹ năng mô phỏng lâm sàng', abbr: 'TTMP' },
  { name: 'Trung tâm Dịch vụ & Chuyển giao công nghệ', abbr: 'TTCGCN' },
  { name: 'Trung tâm Đào tạo theo nhu cầu xã hội', abbr: 'TTĐT' },

  // Bộ môn phổ biến
  { name: 'Bộ môn Ngoại', abbr: 'BM-Ngoai' },
  { name: 'Bộ môn Nội', abbr: 'BM-Noi' },
  { name: 'Bộ môn Dược lý - Dược lâm sàng', abbr: 'DLS' },
  { name: 'Bộ môn Nhi', abbr: 'BM-Nhi' },
  { name: 'Bộ môn Sản', abbr: 'BM-San' },
];

export function getAbbrFromDepartment(deptName?: string): string {
  if (!deptName) return 'KHCN';
  const clean = deptName.trim().toLowerCase();

  // 1. Khớp chính xác
  const exact = DEPARTMENT_ABBREVIATIONS.find(
    (d) => d.name.toLowerCase() === clean
  );
  if (exact) return exact.abbr;

  // 2. Nhận diện từ khóa trọng tâm của các phòng/khoa
  if (clean.includes('kế hoạch') || clean.includes('tài chính') || clean.includes('khtc')) return 'KHTC';
  if (clean.includes('khoa học công nghệ') || clean.includes('kh&cn') || clean.includes('khcn')) return 'KHCN';
  if (clean.includes('công nghệ thông tin') || clean.includes('cntt')) return 'KCNTT';
  if (clean.includes('răng hàm mặt') || clean.includes('rhm')) return 'RHM';
  if (clean.includes('y tế công cộng') || clean.includes('ytcc')) return 'YTCC';
  if (clean.includes('điều dưỡng')) return 'ĐD-KTYH';
  if (clean.includes('khoa học cơ bản') || clean.includes('khcb')) return 'KHCB';
  if (clean.includes('khoa dược') || clean === 'dược') return 'KD';
  if (clean.includes('khoa y') || clean === 'y') return 'KY';
  if (clean.includes('bệnh viện') || clean.includes('bv')) return 'BV';
  if (clean.includes('hành chính') || clean.includes('hcth')) return 'HCTH';
  if (clean.includes('sau đại học') || clean.includes('sđh')) return 'ĐTSĐH';
  if (clean.includes('đào tạo đại học') || clean.includes('đtđh')) return 'ĐTĐH';
  if (clean.includes('công tác sinh viên') || clean.includes('ctsv')) return 'CTSV';
  if (clean.includes('quản trị') || clean.includes('thiết bị')) return 'QTTB';
  if (clean.includes('hợp tác quốc tế') || clean.includes('htqt')) return 'HTQT';
  if (clean.includes('mô phỏng')) return 'TTMP';
  if (clean.includes('chuyển giao công nghệ')) return 'TTCGCN';

  // 3. Khớp một phần
  const partial = DEPARTMENT_ABBREVIATIONS.find(
    (d) => clean.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(clean)
  );
  if (partial) return partial.abbr;

  return 'KHCN';
}

interface DocumentNumberInputProps {
  value: string;
  onChange: (val: string) => void;
  docType?: string; // e.g. "TTr" or "KH"
  currentDepartment?: string;
  hasError?: boolean;
  placeholderNumber?: string;
}

export const DocumentNumberInput: React.FC<DocumentNumberInputProps> = ({
  value,
  onChange,
  docType = 'TTr',
  currentDepartment = '',
  hasError = false,
  placeholderNumber = '15',
}) => {
  // Parse incoming value, e.g. "15/TTr-KHCN" or "/TTr-KHCN" or ".../TTr-KHCN"
  const parseValue = (val: string) => {
    if (!val) return { num: '', type: docType, unit: '' };
    // Pattern: {num}/{type}-{unit} or /{type}-{unit}
    const fullRegex = /^(.*?)\/([^-]+)-(.+)$/;
    const m1 = val.match(fullRegex);
    if (m1) {
      let num = m1[1].trim();
      if (/^\.+$/.test(num)) num = '';
      return { num, type: m1[2].trim(), unit: m1[3].trim() };
    }
    // Pattern: {num}/{type}
    const partialRegex = /^(.*?)\/([^\/]+)$/;
    const m2 = val.match(partialRegex);
    if (m2) {
      let num = m2[1].trim();
      if (/^\.+$/.test(num)) num = '';
      return { num, type: m2[2].trim(), unit: '' };
    }
    // Just number
    let num = val.replace(/[^0-9a-zA-Z]/g, '');
    if (/^\.+$/.test(num)) num = '';
    return { num, type: docType, unit: '' };
  };

  const initial = useMemo(() => parseValue(value), []);
  const defaultNum = initial.num || placeholderNumber || '15';
  const defaultUnit = initial.unit || getAbbrFromDepartment(currentDepartment);
  const [docNum, setDocNum] = useState(defaultNum);
  const [docUnit, setDocUnit] = useState(defaultUnit);

  // Khi khởi tạo nếu value đang rỗng, tự động điền giá trị hoàn chỉnh có sẵn số
  useEffect(() => {
    if (!value && defaultNum && defaultUnit) {
      onChange(`${defaultNum}/${docType}-${defaultUnit}`);
    }
  }, []);

  // Tự động đồng bộ ký hiệu viết tắt khi đơn vị / khoa thay đổi
  useEffect(() => {
    if (currentDepartment) {
      const suggested = getAbbrFromDepartment(currentDepartment);
      if (suggested && suggested !== docUnit) {
        setDocUnit(suggested);
        const cleanN = docNum.replace(/^\.+$/, '').trim() || defaultNum;
        const newFull = `${cleanN}/${docType}-${suggested}`;
        onChange(newFull);
      }
    }
  }, [currentDepartment, docType]);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value !== undefined) {
      const parsed = parseValue(value);
      if (parsed.num !== docNum) setDocNum(parsed.num);
      if (parsed.unit && parsed.unit !== docUnit) setDocUnit(parsed.unit);
    }
  }, [value]);

  const updateFullValue = (newNum: string, newUnit: string) => {
    const cleanNum = newNum.replace(/^\.+$/, '').trim();
    const cleanUnit = newUnit.trim().toUpperCase();
    let full = '';
    if (cleanNum && cleanUnit) {
      full = `${cleanNum}/${docType}-${cleanUnit}`;
    } else if (cleanNum) {
      full = `${cleanNum}/${docType}`;
    } else if (cleanUnit) {
      full = `/${docType}-${cleanUnit}`;
    }
    onChange(full);
  };

  const handleNumChange = (newNum: string) => {
    const clean = newNum.replace(/^\.+$/, '');
    setDocNum(clean);
    updateFullValue(clean, docUnit);
  };

  const handleUnitChange = (newUnit: string) => {
    const upper = newUnit.toUpperCase();
    setDocUnit(upper);
    updateFullValue(docNum, upper);
  };

  const fullDisplay = useMemo(() => {
    const numPart = docNum ? docNum : '...';
    const unitPart = docUnit ? docUnit : '...';
    return `${numPart}/${docType}-${unitPart}`;
  }, [docNum, docType, docUnit]);

  return (
    <div className="space-y-1.5">
      {/* 1. Connected 3-Part Input Group */}
      <div className={`flex items-stretch rounded-md shadow-2xs overflow-hidden border transition-all bg-white ${
        hasError || !docNum.trim()
          ? 'border-rose-400 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-400/20'
          : 'border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20'
      }`}>
        {/* Part 1: Số thứ tự (ví dụ: 15) - BẮT BUỘC */}
        <div className="relative flex-1 min-w-[95px] max-w-[140px]">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <span className="text-[11px] font-bold text-slate-600">Số:</span>
            <span className="text-[12px] font-bold text-rose-500 ml-0.5 leading-none" title="Bắt buộc nhập số">*</span>
          </div>
          <input
            type="text"
            required
            value={docNum}
            onChange={(e) => handleNumChange(e.target.value)}
            placeholder={placeholderNumber}
            className={`w-full pl-9 pr-2 py-2 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none ${
              hasError || !docNum.trim() ? 'bg-rose-50/30 text-rose-900' : ''
            }`}
          />
        </div>

        {/* Part 2: Dấu phân cách cố định /TTr- */}
        <div className="bg-slate-100 border-x border-slate-200 px-3 flex items-center justify-center select-none text-xs font-mono font-extrabold text-blue-900 tracking-wider">
          /{docType}-
        </div>

        {/* Part 3: Ký hiệu Đơn vị/Khoa (ví dụ: KHCN) */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={docUnit}
            onChange={(e) => handleUnitChange(e.target.value)}
            placeholder="KHCN, KCNTT, KY..."
            className="w-full px-3 py-2 text-xs font-mono font-bold text-blue-700 bg-white focus:outline-none uppercase tracking-wide"
          />
          {docUnit && (
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-semibold">
                ✓
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Live Preview Banner */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-blue-50/70 border border-blue-200/80 rounded text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-600">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>Số {docType === 'TTr' ? 'tờ trình' : 'văn bản'} hoàn chỉnh:</span>
        </div>
        <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs">
          Số: {fullDisplay}
        </span>
      </div>

      {!docNum.trim() && (
        <div className="text-[11px] text-rose-600 font-medium flex items-center gap-1 pl-0.5">
          <span>* Bắt buộc nhập phần số thứ tự văn bản (ví dụ: {placeholderNumber || '15'})</span>
        </div>
      )}
    </div>
  );
};
