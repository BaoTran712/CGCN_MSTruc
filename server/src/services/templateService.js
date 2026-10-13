import { templateRepository } from '../repositories/templateRepository.js';

export const templateService = {
  async getAll() {
    return templateRepository.findAll();
  },

  async getById(id) {
    return templateRepository.findById(id);
  },

  async save(tmpl) {
    return templateRepository.save(tmpl);
  },
};
