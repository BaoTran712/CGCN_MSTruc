/**
 * Data Transfer Object (DTO) chuẩn hóa định dạng dữ liệu trả về cho Client
 * Tương đương với ResponseEntity<ApiResponse<T>> trong Spring Boot
 */
export class ApiResponse {
  constructor({
    success,
    message = '',
    data = null,
    errors = null,
    statusCode = 200,
    timestamp = new Date().toISOString(),
  }) {
    this.success = success;
    this.message = message;
    this.data = data;
    if (errors) this.errors = errors;
    this.statusCode = statusCode;
    this.timestamp = timestamp;
  }

  /**
   * Tạo phản hồi thành công (HTTP 200, 201)
   */
  static success(data = null, message = 'Thao tác thành công', statusCode = 200) {
    return new ApiResponse({
      success: true,
      message,
      data,
      statusCode,
    });
  }

  /**
   * Tạo phản hồi thất bại (HTTP 400, 404, 500)
   */
  static error(message = 'Đã xảy ra lỗi xử lý', statusCode = 500, errors = null) {
    return new ApiResponse({
      success: false,
      message,
      data: null,
      errors,
      statusCode,
    });
  }

  /**
   * Gửi phản hồi trực tiếp qua Express response object
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
      ...(this.errors ? { errors: this.errors } : {}),
      timestamp: this.timestamp,
    });
  }
}
