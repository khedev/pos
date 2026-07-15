/**
 * Suppliers service.
 * All supplier API calls go through here.
 */
import { suppliersAPI } from '@/lib/api';

export const suppliersService = {
  getAll: async (params = {}) => {
    const res = await suppliersAPI.getAll(params);
    return res.data?.items || [];
  },

  getById: async (id) => {
    if (!id) return null;
    const res = await suppliersAPI.getById(id);
    return res.data;
  },

  create: (data) => suppliersAPI.create(data),

  update: ({ id, data }) => suppliersAPI.update(id, data),

  delete: (id) => suppliersAPI.delete(id),
};