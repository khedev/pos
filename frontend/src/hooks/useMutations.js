/**
 * Centralized mutation hooks with automatic cache invalidation.
 * Every mutation should invalidate only the affected queries.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  inventoryAPI,
  salesAPI,
  receivingAPI,
  categoriesAPI,
  suppliersAPI,
  usersAPI,
  notificationsAPI,
  settingsAPI,
  activityAPI,
} from '@/lib/api';

// ============================================================
// Products / Inventory Mutations
// ============================================================

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => inventoryAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product added successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to add product');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => inventoryAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update product');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => inventoryAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => inventoryAPI.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product archived successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to archive product');
    },
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }) => inventoryAPI.uploadImage(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Image uploaded successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to upload image');
    },
  });
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => inventoryAPI.deleteImage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Image removed');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete image');
    },
  });
}

// ============================================================
// Sales Mutations
// ============================================================

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => salesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Sale completed!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Checkout failed');
    },
  });
}

export function useVoidTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => salesAPI.voidTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Transaction voided');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Void failed');
    },
  });
}

// ============================================================
// Receiving Mutations
// ============================================================

export function useCreateReceiving() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => receivingAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receiving'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Receiving record created');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create receiving record');
    },
  });
}

export function useUpdateReceiving() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => receivingAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receiving'] });
      toast.success('Receiving record updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update receiving record');
    },
  });
}

// ============================================================
// Categories Mutations
// ============================================================

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => categoriesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create category');
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => categoriesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update category');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => categoriesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    },
  });
}

// ============================================================
// Suppliers Mutations
// ============================================================

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => suppliersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier created');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create supplier');
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => suppliersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update supplier');
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => suppliersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete supplier');
    },
  });
}

// ============================================================
// Users Mutations
// ============================================================

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => usersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create user');
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update user');
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => usersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    },
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => usersAPI.resetPassword(id, data),
    onSuccess: () => {
      toast.success('Password reset sent');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    },
  });
}

// ============================================================
// Settings Mutations
// ============================================================

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data }) => settingsAPI.update(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Setting updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update setting');
    },
  });
}

export function useUpdateCompanyInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => settingsAPI.updateCompanyInfo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Company info updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update company info');
    },
  });
}

// ============================================================
// Notifications Mutations
// ============================================================

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationsAPI.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}