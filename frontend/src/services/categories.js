/**
 * Categories service.
 * All category API calls go through here.
 */
import { categoriesAPI } from '@/lib/api';

export const categoriesService = {
  getAll: async (params = {}) => {
    const res = await categoriesAPI.getAll(params);
    return res.data?.items || [];
  },

  getById: async (id) => {
    if (!id) return null;
    const res = await categoriesAPI.getById(id);
    return res.data;
  },

  create: (data) => categoriesAPI.create(data),

  update: ({ id, data }) => categoriesAPI.update(id, data),

  delete: (id) => categoriesAPI.delete(id),
};