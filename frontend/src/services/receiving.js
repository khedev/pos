/**
 * Receiving service.
 * All receiving API calls go through here.
 */
import { receivingAPI } from '@/lib/api';

export const receivingService = {
  getAll: async (params = {}) => {
    const res = await receivingAPI.getAll(params);
    return res.data;
  },

  getById: async (id) => {
    if (!id) return null;
    const res = await receivingAPI.getById(id);
    return res.data;
  },

  create: (data) => receivingAPI.create(data),

  update: ({ id, data }) => receivingAPI.update(id, data),

  print: (id) => receivingAPI.print(id),
};