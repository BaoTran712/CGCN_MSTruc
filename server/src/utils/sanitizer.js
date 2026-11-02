/**
 * Payload & Template Sanitization Utility
 * - Chuyển toàn bộ giá trị null hoặc undefined thành chuỗi rỗng ""
 * - Chuẩn hóa ký tự xuống dòng (\r\n -> \n) và gộp dòng trống dư thừa
 * - Lọc bỏ các thẻ HTML rác (<...>) vô tình gửi lên từ form
 * - Loại bỏ chuỗi chữ "undefined", "null", thẻ biến chưa render ({...}, {{...}})
 * - Chuẩn hóa tiếng Việt dựng sẵn Unicode NFC
 */

export function sanitizeStringValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'string') return String(val);

  let cleaned = val
    .normalize('NFC')
    // Chuẩn hóa ký tự xuống dòng
    .replace(/\r\n?/g, '\n')
    // Loại bỏ khối script/style và toàn bộ thẻ HTML rác
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    // Loại bỏ thẻ biến chưa render {{...}} hoặc {...}
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\{[a-zA-Z0-9_.]+\}/g, '')
    // Loại bỏ hướng dẫn mẫu trong ngoặc đơn kiểu (Ví dụ: ...), (Ghi rõ ...)
    .replace(/\((?:Ví dụ|Ghi rõ|Điền đầy đủ|Hướng dẫn):[^)]*\)/gi, '')
    // Loại bỏ chuỗi literal "undefined" hoặc "null" đứng độc lập
    .replace(/\b(?:undefined|null)\b/gi, '')
    // Gộp nhiều dòng trống liên tiếp
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

/**
 * Đệ quy làm sạch toàn bộ payload JSON từ Web Form trước khi lưu Database và bơm vào Word/PDF
 */
export function sanitizeFormPayload(payload) {
  if (payload === null || payload === undefined) {
    return {};
  }

  if (typeof payload === 'string') {
    return sanitizeStringValue(payload);
  }

  if (typeof payload === 'number') {
    return Number.isFinite(payload) ? payload : '';
  }

  if (typeof payload === 'boolean') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload
      .map((item) => {
        if (item === null || item === undefined) return '';
        if (typeof item === 'string') return sanitizeStringValue(item);
        if (typeof item === 'object') return sanitizeFormPayload(item);
        return item;
      })
      .filter((item) => {
        if (typeof item === 'string') return item.length > 0;
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          return Object.values(item).some((v) => v !== '' && v !== null && v !== undefined);
        }
        return true;
      });
  }

  if (typeof payload === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value === null || value === undefined) {
        sanitized[key] = '';
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeStringValue(value);
      } else if (typeof value === 'number') {
        sanitized[key] = Number.isFinite(value) ? value : '';
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value) || typeof value === 'object') {
        sanitized[key] = sanitizeFormPayload(value);
      } else {
        sanitized[key] = '';
      }
    }
    return sanitized;
  }

  return {};
}

/**
 * Express Middleware tự động làm sạch req.body.formData / req.body.form_data
 */
export function sanitizePayloadMiddleware(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    if (req.body.formData && typeof req.body.formData === 'object') {
      req.body.formData = sanitizeFormPayload(req.body.formData);
    }
    if (req.body.form_data && typeof req.body.form_data === 'object') {
      req.body.form_data = sanitizeFormPayload(req.body.form_data);
    }
    if (typeof req.body.revisionNote === 'string') {
      req.body.revisionNote = sanitizeStringValue(req.body.revisionNote);
    }
    if (typeof req.body.revision_note === 'string') {
      req.body.revision_note = sanitizeStringValue(req.body.revision_note);
    }
    if (typeof req.body.reviewNotes === 'string') {
      req.body.reviewNotes = sanitizeStringValue(req.body.reviewNotes);
    }
    if (typeof req.body.comment === 'string') {
      req.body.comment = sanitizeStringValue(req.body.comment);
    }
  }
  next();
}

export default {
  sanitizeStringValue,
  sanitizeFormPayload,
  sanitizePayloadMiddleware,
};

