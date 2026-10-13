import { departmentRepository } from '../repositories/departmentRepository.js';

export const departmentService = {
  async getAll() {
    return departmentRepository.findAll();
  },

  async getById(id) {
    return departmentRepository.findById(id);
  },

  async save(dept) {
    return departmentRepository.save(dept);
  },
};
