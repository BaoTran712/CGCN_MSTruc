import React, { useState } from 'react';
import { Building2, Plus, Edit2, ShieldCheck, UserCheck, Folder, CheckCircle2 } from 'lucide-react';
import { Department, User } from '../types';

interface DepartmentsViewProps {
  departments: Department[];
  users: User[];
  onSaveDepartment: (department: Department) => Promise<void>;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({
  departments = [],
  users = [],
  onSaveDepartment,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [formData, setFormData] = useState<Partial<Department>>({
    code: '',
    name: '',
    managerId: '',
    secretaryId: '',
    driveFolderId: '',
  });

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({
      code: '',
      name: '',
      managerId: '',
      secretaryId: '',
      driveFolderId: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({ ...dept });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return;

    const managerObj = users.find((u) => u.id === formData.managerId);
    const secretaryObj = users.find((u) => u.id === formData.secretaryId);

    const saved: Department = {
      id: editingDept ? editingDept.id : `dept_${formData.code.toLowerCase()}_${Date.now()}`,
      code: formData.code.toUpperCase(),
      name: formData.name,
      managerId: formData.managerId,
      managerName: managerObj?.name || formData.managerName || 'Chưa gán',
      secretaryId: formData.secretaryId,
      secretaryName: secretaryObj?.name || formData.secretaryName || 'Chưa gán',
      driveFolderId: formData.driveFolderId || `1drive_folder_${formData.code.toLowerCase()}`,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveDepartment(saved);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              QUẢN TRỊ HỆ THỐNG
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý Phòng ban & Cấu hình Đơn vị
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Khai báo cấu hình đơn vị, chỉ định Lãnh đạo thẩm định, Văn thư tiếp nhận và Thư mục Google Drive
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm Phòng ban mới</span>
        </button>
      </div>

      {/* Grid List of Departments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map((dept) => (
          <div key={dept.id} className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                  {dept.code}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">{dept.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => handleOpenEdit(dept)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                title="Chỉnh sửa đơn vị"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-700" /> Người duyệt
                </span>
                <p className="font-semibold text-slate-900 truncate">{dept.managerName || 'Chưa phân công'}</p>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-slate-600" /> Văn thư
                </span>
                <p className="font-semibold text-slate-900 truncate">{dept.secretaryName || 'Chưa phân công'}</p>
              </div>
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between text-slate-600 font-mono">
              <span className="flex items-center gap-1.5 text-slate-500 font-sans text-[11px]">
                <Folder className="w-3.5 h-3.5 text-blue-700" /> Drive Folder:
              </span>
              <span className="text-slate-800 font-bold truncate max-w-[200px] text-[11px]">{dept.driveFolderId || 'N/A'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-lg shadow-md border border-slate-200 w-full max-w-lg p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
              {editingDept ? `Chỉnh sửa phòng ban (${editingDept.code})` : 'Khai báo Phòng ban mới'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã đơn vị (Code)</label>
                <input
                  type="text"
                  required
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ví dụ: KCNTT, PDT"
                  className="w-full px-3 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên phòng ban / đơn vị</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Khoa Công nghệ Thông tin"
                  className="w-full px-3 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trưởng phòng phụ trách duyệt</label>
                <select
                  value={formData.managerId || ''}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
                >
                  <option value="">-- Chọn Trưởng phòng --</option>
                  {users
                    .filter((u) => u.role === 'MANAGER' || u.role === 'manager' || u.role === 'ADMIN' || u.role === 'admin')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.title})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Văn thư phụ trách tiếp nhận</label>
                <select
                  value={formData.secretaryId || ''}
                  onChange={(e) => setFormData({ ...formData, secretaryId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
                >
                  <option value="">-- Chọn Văn thư --</option>
                  {users
                    .filter((u) => u.role === 'SECRETARY' || u.role === 'secretary' || u.role === 'ADMIN' || u.role === 'admin')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.title})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Drive Folder ID</label>
                <input
                  type="text"
                  value={formData.driveFolderId || ''}
                  onChange={(e) => setFormData({ ...formData, driveFolderId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
