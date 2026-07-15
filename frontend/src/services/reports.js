/**
 * Reports service.
 * All report API calls go through here.
 */
import { reportsAPI } from '@/lib/api';

export const reportsService = {
  getSales: async (params = {}) => {
    const res = await reportsAPI.getSales(params);
    return res.data;
  },

  getItemSales: async (params = {}) => {
    const res = await reportsAPI.getItemSales(params);
    return res.data;
  },

  getCategorySales: async (params = {}) => {
    const res = await reportsAPI.getCategorySales(params);
    return res.data;
  },

  getInventory: async (params = {}) => {
    const res = await reportsAPI.getInventory(params);
    return res.data;
  },

  getReceiving: async (params = {}) => {
    const res = await reportsAPI.getReceiving(params);
    return res.data;
  },

  exportSalesPdf: (params) => reportsAPI.exportSalesPdf(params),

  exportSalesExcel: (params) => reportsAPI.exportSalesExcel(params),

  exportInventoryPdf: (params) => reportsAPI.exportInventoryPdf(params),

  exportInventoryExcel: (params) => reportsAPI.exportInventoryExcel(params),
};