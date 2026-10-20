import React, { useState, useEffect } from 'react';
import { Building2, Edit3 } from 'lucide-react';

export interface DepartmentGroup {
  group: string;
  items: string[];
}

export const CTUMP_DEPARTMENT_GROUPS: DepartmentGroup[] = [
  {
    group: 'Các Khoa chuyên môn',
    items: [
      'Khoa Y',
      'Khoa Dược',
      'Khoa Răng Hàm Mặt',
      'Khoa Y tế Công cộng',
      'Khoa Điều dưỡng và Kỹ thuật Y học',
      'Khoa Khoa học Cơ bản',
      'Khoa Công nghệ Thông tin',
    ],
  },
  {
    group: 'Phòng ban chức năng',
    items: [
      'Phòng Khoa học Công nghệ',
      'Phòng Đào tạo Đại học',
      'Phòng Đào tạo Sau đại học',
      'Phòng Hành chính - Tổng hợp',
      'Phòng Kế hoạch - Tài chính',
      'Phòng Công tác Sinh viên',
      'Phòng Quản trị - Thiết bị',
      'Phòng Hợp tác Quốc tế',
    ],
  },
  {
    group: 'Bệnh viện & Trung tâm',
    items: [
      'Bệnh viện Trường Đại học Y Dược Cần Thơ',
      'Trung tâm Huấn luyện Kỹ năng mô phỏng lâm sàng',
      'Trung tâm Dịch vụ & Chuyển giao công nghệ',
      'Trung tâm Đào tạo theo nhu cầu xã hội',
    ],
  },
];

const ALL_STANDARD_DEPTS = CTUMP_DEPARTMENT_GROUPS.flatMap((g) => g.items);

interface DepartmentSelectProps {
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
  placeholder?: string;
  id?: string;
}

export const DepartmentSelect: React.FC<DepartmentSelectProps> = ({
  value,
  onChange,
  hasError = false,
  placeholder = '-- Chọn Đơn vị / Khoa / Bộ môn trình --',
  id,
}) => {
  const isStandard = ALL_STANDARD_DEPTS.includes(value);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(() => {
    return Boolean(value && !isStandard);
  });

  useEffect(() => {
    if (value && !ALL_STANDARD_DEPTS.includes(value)) {
      setIsCustomMode(true);
    }
  }, [value]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__custom__') {
      setIsCustomMode(true);
      onChange('');
    } else {
      setIsCustomMode(false);
      onChange(selected);
    }
  };

  const selectValue = isCustomMode ? '__custom__' : isStandard ? value : value ? '__custom__' : '';

  return (
    <div className="space-y-1.5 w-full">
      <div className="relative">
        <select
          id={id}
          value={selectValue}
          onChange={handleSelectChange}
          className={`w-full px-3 py-2 text-xs border rounded-md bg-white text-slate-900 font-medium focus:outline-none focus:ring-1 transition-colors cursor-pointer ${
            hasError
              ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/30'
              : 'border-slate-300 hover:border-slate-400 focus:ring-blue-600 focus:border-blue-600'
          }`}
        >
          <option value="">{placeholder}</option>
          {CTUMP_DEPARTMENT_GROUPS.map((grp) => (
            <optgroup key={grp.group} label={`── ${grp.group} ──`} className="font-semibold text-slate-700">
              {grp.items.map((item) => (
                <option key={item} value={item} className="text-slate-900 font-normal">
                  {item}
                </option>
              ))}
            </optgroup>
          ))}
          <optgroup label="── Khác ──" className="font-semibold text-slate-700">
            <option value="__custom__">Đơn vị / Bộ môn khác (Tự nhập tay)...</option>
          </optgroup>
        </select>
      </div>

      {isCustomMode && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Nhập tên Đơn vị, Khoa hoặc Bộ môn cụ thể..."
              autoFocus
              className={`w-full px-3 py-1.5 text-xs border rounded-md text-slate-900 focus:outline-none focus:ring-1 ${
                hasError
                  ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20'
                  : 'border-blue-400 focus:ring-blue-600 focus:border-blue-600 bg-blue-50/20'
              }`}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCustomMode(false);
              onChange('');
            }}
            className="px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            title="Quay lại danh sách chọn nhanh"
          >
            Hủy nhập tay
          </button>
        </div>
      )}
    </div>
  );
};
