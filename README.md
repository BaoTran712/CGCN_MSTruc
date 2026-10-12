# CTUMP DocuGov — Quản lý hồ sơ Chuyển giao Công nghệ (CGCN)

Ứng dụng web (React + Vite + Tailwind CSS v4) mô phỏng quy trình lập, thẩm định, trình ký và lưu trữ hồ sơ hành chính (Tờ trình CGCN, Kế hoạch CGCN, ...), xuất văn bản Word (.docx) trực tiếp trên trình duyệt.

## Chạy local

**Yêu cầu:** Node.js 20+

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # kiểm tra kiểu TypeScript
npm run build    # build production vào dist/
```

## Backend

Cấu hình webhook n8n tại [`src/config/api.config.ts`](src/config/api.config.ts).
Khi `API_BASE_URL` còn là placeholder, toàn bộ API chạy ở **chế độ mock** (dữ liệu trong `src/services/mockData.ts`, lưu trạng thái qua `localStorage`).

## Cấu trúc chuẩn React (Clean Architecture)

```
src/
├── assets/       # Tài nguyên tĩnh (logo, ảnh)
├── components/   # UI components theo phân loại chuẩn
│   ├── common/   # StatusBadge, Toast, LoadingSpinner
│   ├── document/ # WordDocumentPreview
│   ├── dossiers/ # AuditLogViewer, VersionHistoryViewer
│   ├── layout/   # Header, Sidebar, MainLayout
│   ├── modals/   # ManagerEdit, Return, TemplateDetail, Signature, XmlInspector
│   └── timeline/ # ApprovalTimeline
├── config/       # Cấu hình endpoint n8n (api.config.ts)
├── constants/    # Hằng số hệ thống, default dev user, storage keys
├── contexts/     # React Context Providers (AuthContext, ToastContext, DossierContext)
├── hooks/        # Custom React Hooks (useAuth, useToast, useDossiers)
├── pages/        # Các màn hình chức năng & LoginPage
├── services/     # api.ts (fetch + mock fallback), mockRepository, workflowEngine
├── types/        # TypeScript domain types & interfaces
└── utils/        # Xuất DOCX, engine Word XML, helpers, textUtils
docs/
├── REQUIREMENTS.md       # Đặc tả kiến trúc mục tiêu
├── flow_dexuat.txt       # Luồng n8n + Google Form/Sheets đề xuất
├── hình ảnh bổ sung.jpg  # Ghi chú quy trình trình ký (viết tay)
└── templates/            # Biểu mẫu Word gốc (Mẫu 1a, Mẫu 2a)
```

