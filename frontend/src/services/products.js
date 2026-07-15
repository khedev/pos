/**
 * Products & Inventory service.
 * All product/inventory API calls go through here.
 * Never call inventoryAPI directly from components.
 */
import { inventoryAPI } from '@/lib/api';

export const productsService = {
  getAll: async (params = {}) => {
    const res = await inventoryAPI.getAll(params);
    return res.data;
  },

  getById: async (id) => {
    if (!id) return null;
    const res = await inventoryAPI.getById(id);
    return res.data;
  },

  create: (data) => inventoryAPI.create(data),

  update: ({ id, data }) => inventoryAPI.update(id, data),

  delete: (id) => inventoryAPI.delete(id),

  archive: (id) => inventoryAPI.archive(id),

  uploadImage: ({ id, formData }) => inventoryAPI.uploadImage(id, formData),

  deleteImage: (id) => inventoryAPI.deleteImage(id),

  importExcel: (formData) => inventoryAPI.importExcel(formData),

  exportExcel: () => inventoryAPI.exportExcel(),

  exportPdf: () => inventoryAPI.exportPdf(),

  search: async (query, category = '', limit = 20) => {
    const params = { search: query, limit };
    if (category) params.category = category;
    const res = await inventoryAPI.getAll(params);
    return res.data.items || [];
  },
};