import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isDbConnected, query } from './db.js';
import { mockStore } from './mockStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

const UPLOAD_SUBDIRS = ['docx', 'pdf', 'signed', 'evidence'];

/**
 * Chuyển đường dẫn URL tĩnh (vd: /uploads/pdf/CGCN-2026-0001-v1.pdf) sang đường dẫn tuyệt đối trên ổ đĩa
 */
export function resolveUploadAbsolutePath(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  if (path.isAbsolute(trimmed) && fs.existsSync(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/uploads/')) {
    const rel = trimmed.replace(/^\/uploads\//, '');
    return path.join(UPLOADS_ROOT, rel);
  }

  if (trimmed.startsWith('server/uploads/')) {
    const rel = trimmed.replace(/^server\/uploads\//, '');
    return path.join(UPLOADS_ROOT, rel);
  }

  return path.resolve(UPLOADS_ROOT, trimmed);
}

/**
 * Xóa file vật lý cũ khi sinh phiên bản mới (v1 -> v2) hoặc khi xóa đơn
 */
export function deletePhysicalFile(urlOrPath) {
  try {
    const absPath = resolveUploadAbsolutePath(urlOrPath);
    if (absPath && fs.existsSync(absPath) && absPath.startsWith(UPLOADS_ROOT)) {
      fs.unlinkSync(absPath);
      return true;
    }
  } catch (err) {
    console.warn(`[GarbageCleanup] Không thể xóa file cũ (${urlOrPath}): ${err.message}`);
  }
  return false;
}

/**
 * Trích xuất toàn bộ tập hợp file tuyệt đối đang gắn với một danh sách hồ sơ hợp lệ
 */
function collectReferencedFiles(dossiers = []) {
  const referenced = new Set();

  const addRef = (urlOrPath) => {
    const abs = resolveUploadAbsolutePath(urlOrPath);
    if (abs) {
      referenced.add(path.normalize(abs).toLowerCase());
    }
  };

  for (const d of dossiers) {
    if (!d) continue;
    addRef(d.generated_docx_path);
    addRef(d.docx_file_url);
    addRef(d.generated_pdf_path);
    addRef(d.approved_pdf_path);
    addRef(d.precheck_pdf_url);
    addRef(d.faculty_signed_pdf_url);
    addRef(d.final_signed_pdf_path);
    addRef(d.final_pdf_url);

    const fileLists = [
      d.department_signed_files,
      d.resubmitted_signed_files,
      d.evidence_files,
      d.evidenceFiles,
    ];

    for (const list of fileLists) {
      let arr = list;
      if (typeof arr === 'string') {
        try {
          arr = JSON.parse(arr);
        } catch {
          arr = [];
        }
      }
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (typeof item === 'string') {
            addRef(item);
          } else if (item && typeof item === 'object') {
            addRef(item.url || item.path || item.fileUrl);
          }
        }
      }
    }
  }

  return referenced;
}

/**
 * Kiểm tra xem một bản ghi hồ sơ có hợp lệ hay là bản nháp lỗi / dữ liệu test rác
 */
function isValidDossierRecord(d) {
  if (!d || typeof d !== 'object') return false;
  if (!d.id || !d.code) return false;
  if (!String(d.code).startsWith('CGCN-')) return false;

  // Loại bỏ bản ghi seed test cũ có review_notes = 'sai tên' hoặc id = 'dos-2026-0001'
  if (d.id === 'dos-2026-0001' || d.review_notes === 'sai tên') {
    return false;
  }

  const formData = d.form_data || d.formData;
  if (!formData || (typeof formData === 'object' && Object.keys(formData).length === 0)) {
    return false;
  }

  return true;
}

/**
 * Dọn dẹp toàn diện Database Rác & File Rác Lưu Trữ (Database & Storage Garbage Collection)
 */
export async function cleanupGarbageData() {
  let removedDbRecords = 0;
  let removedOrphanFiles = 0;
  const removedFilesList = [];

  // 1. Dọn dẹp trên MySQL (nếu đang kết nối)
  let activeDossiers = [];
  if (isDbConnected()) {
    try {
      const delRes = await query(`
        DELETE FROM dossiers
        WHERE code IS NULL
           OR code NOT LIKE 'CGCN-%'
           OR id = 'dos-2026-0001'
           OR review_notes = 'sai tên'
           OR status = 'DRAFT'
      `);
      removedDbRecords += delRes?.affectedRows || 0;
      activeDossiers = await query(`SELECT * FROM dossiers`);
    } catch (err) {
      console.warn(`[GarbageCleanup] Cảnh báo khi dọn MySQL: ${err.message}`);
    }
  }

  // 2. Dọn dẹp trên In-Memory Store
  const beforeCount = mockStore.dossiers.length;
  mockStore.dossiers = mockStore.dossiers.filter((d) => isValidDossierRecord(d));
  removedDbRecords += beforeCount - mockStore.dossiers.length;

  const allValidDossiers = [...activeDossiers, ...mockStore.dossiers];
  const referencedSet = collectReferencedFiles(allValidDossiers);

  // 3. Quét thư mục uploads và xóa mọi file mồ côi (orphaned files)
  for (const sub of UPLOAD_SUBDIRS) {
    const dirPath = path.join(UPLOADS_ROOT, sub);
    if (!fs.existsSync(dirPath)) continue;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (entry.name === '.gitkeep') continue;

      const fullPath = path.join(dirPath, entry.name);
      const normalized = path.normalize(fullPath).toLowerCase();

      if (!referencedSet.has(normalized)) {
        try {
          fs.unlinkSync(fullPath);
          removedOrphanFiles++;
          removedFilesList.push(`/uploads/${sub}/${entry.name}`);
        } catch (err) {
          console.warn(`[GarbageCleanup] Không thể xóa file mồ côi ${fullPath}: ${err.message}`);
        }
      }
    }
  }

  return {
    removedDbRecords,
    removedOrphanFiles,
    removedFilesList,
    activeDossierCount: allValidDossiers.length,
  };
}

export default {
  resolveUploadAbsolutePath,
  deletePhysicalFile,
  cleanupGarbageData,
};

