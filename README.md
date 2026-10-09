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

## Cấu trúc

```
src/
├── components/   # layout, modals, timeline, document preview
├── config/       # cấu hình endpoint n8n
├── pages/        # các màn hình chính
├── services/     # api.ts (fetch + mock fallback), mockRepository, workflowEngine
├── types/        # domain types
└── utils/        # xuất DOCX, engine Word XML, helpers
docs/
├── REQUIREMENTS.md       # đặc tả kiến trúc mục tiêu
├── flow_dexuat.txt       # luồng n8n + Google Form/Sheets đề xuất
├── hình ảnh bổ sung.jpg  # ghi chú quy trình trình ký (viết tay)
└── templates/            # biểu mẫu Word gốc (Mẫu 1a, Mẫu 2a)
```
