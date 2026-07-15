/**
 * Sales & POS service.
 * All sales/POS API calls go through here.
 */
import { salesAPI } from '@/lib/api';

export const salesService = {
  getAll: async (params = {}) => {
    const res = await salesAPI.getAll(params);
    return res.data;
  },

  create: (data) => salesAPI.create(data),

  voidTransaction: ({ id, data }) => salesAPI.voidTransaction(id, data),
};