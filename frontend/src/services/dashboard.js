/**
 * Dashboard service.
 * All dashboard API calls go through here.
 */
import { dashboardAPI } from '@/lib/api';

export const dashboardService = {
  getSummary: async () => {
    const res = await dashboardAPI.getSummary();
    return res.data;
  },

  getGraph: async () => {
    const res = await dashboardAPI.getGraph();
    return res.data;
  },

  getDailySales: async () => {
    const res = await dashboardAPI.getDailySales();
    return res.data;
  },

  getCategorySales: async () => {
    const res = await dashboardAPI.getCategorySales();
    return res.data;
  },

  getItemSales: async () => {
    const res = await dashboardAPI.getItemSales();
    return res.data;
  },
};