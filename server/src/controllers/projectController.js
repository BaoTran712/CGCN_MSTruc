import { projectService } from '../services/projectService.js';
import { ApiResponse } from '../dtos/apiResponse.js';
import {
  CreateProjectRequestDto,
  ReviewProjectRequestDto,
  UploadDeanSignedDto,
  CompleteProjectRequestDto,
  ProjectResponseDto,
} from '../dtos/projectDto.js';

export const projectController = {
  /**
   * POST /api/projects
   * Tiếp nhận form từ React -> mapping Word -> lưu DB (transfer_projects, attachments, audit_logs)
   */
  async create(req, res) {
    try {
      const dto = new CreateProjectRequestDto(req.body);
      const project = await projectService.createProject(dto);
      return ApiResponse.success(
        ProjectResponseDto.fromModel(project),
        'Khởi tạo hồ sơ dự án và tự động xuất bản thảo Word thành công!',
        201
      ).send(res);
    } catch (err) {
      console.error('[ProjectController:create] Error:', err);
      return ApiResponse.error(err.message, 400).send(res);
    }
  },

  /**
   * GET /api/projects/:id
   * Lấy chi tiết hồ sơ và timeline log cho component dossiers & timeline
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const project = await projectService.getProjectById(id);
      return ApiResponse.success(
        ProjectResponseDto.fromModel(project),
        'Lấy thông tin chi tiết hồ sơ thành công'
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 404).send(res);
    }
  },

  /**
   * GET /api/projects
   * Lấy danh sách hồ sơ dự án
   */
  async getAll(req, res) {
    try {
      const { userId, status } = req.query;
      const projects = await projectService.getAllProjects({ userId, status });
      const dtos = projects.map((p) => ProjectResponseDto.fromModel(p));
      return ApiResponse.success(dtos, `Đã tải ${dtos.length} hồ sơ dự án thành công`).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  /**
   * POST /api/projects/:id/review
   * Admin duyệt hoặc yêu cầu sửa
   */
  async review(req, res) {
    try {
      const { id } = req.params;
      const dto = new ReviewProjectRequestDto(req.body);
      const project = await projectService.reviewProject(id, dto);
      const msg = dto.isValid ? 'Admin đã duyệt tiền kiểm thành công' : 'Admin đã gửi yêu cầu chỉnh sửa hồ sơ';
      return ApiResponse.success(ProjectResponseDto.fromModel(project), msg).send(res);
    } catch (err) {
      console.error('[ProjectController:review] Error:', err);
      return ApiResponse.error(err.message, 400).send(res);
    }
  },

  /**
   * POST /api/projects/:id/upload-dean-signed
   * Cán bộ upload PDF ký Khoa
   */
  async uploadDeanSigned(req, res) {
    try {
      const { id } = req.params;
      const dto = new UploadDeanSignedDto(req);
      const project = await projectService.uploadDeanSigned(id, dto);
      return ApiResponse.success(
        ProjectResponseDto.fromModel(project),
        'Tải lên văn bản scan ký số cấp Khoa thành công!'
      ).send(res);
    } catch (err) {
      console.error('[ProjectController:uploadDeanSigned] Error:', err);
      return ApiResponse.error(err.message, 400).send(res);
    }
  },

  /**
   * POST /api/projects/:id/complete
   * Admin đóng hồ sơ
   */
  async complete(req, res) {
    try {
      const { id } = req.params;
      const dto = new CompleteProjectRequestDto(req.body);
      const project = await projectService.completeProject(id, dto);
      return ApiResponse.success(
        ProjectResponseDto.fromModel(project),
        'Đã ban hành quyết định và đóng hoàn tất hồ sơ dự án thành công!'
      ).send(res);
    } catch (err) {
      console.error('[ProjectController:complete] Error:', err);
      return ApiResponse.error(err.message, 400).send(res);
    }
  },
};

export default projectController;
