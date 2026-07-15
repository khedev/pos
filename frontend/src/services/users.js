/**
 * Users service.
 * All user management API calls go through here.
 */
import { usersAPI } from '@/lib/api';

export const usersService = {
  getAll: async (params = {}) => {
    const res = await usersAPI.getAll(params);
    return res.data;
  },

  create: (data) => usersAPI.create(data),

  update: ({ id, data }) => usersAPI.update(id, data),

  delete: (id) => usersAPI.delete(id),

  resetPassword: ({ id, data }) => usersAPI.resetPassword(id, data),
};