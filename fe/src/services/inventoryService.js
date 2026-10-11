/**
 * Inventory Service
 * 
 * This service handles all inventory-related operations including
 * stock management, item tracking, and inventory status monitoring.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import api from './api';

/**
 * Inventory Service Object
 * 
 * Contains methods for inventory management and stock tracking.
 * All methods return a standardized response object with success status and data/message.
 */
export const inventoryService = {
  /**
   * Get All Inventory
   * 
   * Retrieves a list of all inventory items from the database.
   * 
   * @returns {Promise<Object>} Response object with success status and inventory list
   */
  getAllInventory: async (options = {}) => {
    try {
      const response = await api.get('/inventory', { params: options.params || {} });
      let data = response.data;

      if (options.fetchAll) {
        try {
          const collected = [];
          let page = 1;
          const respPageSize = Number(response.data?.pageSize || response.data?.page_size || 0) || (Array.isArray(data) ? data.length : 0) || 50;
          while (true) {
            const pagedResp = await api.get('/inventory', { params: { page, pageSize: respPageSize } });
            const pageData = pagedResp.data?.data || pagedResp.data || [];
            if (!pageData || pageData.length === 0) break;
            for (const it of pageData) collected.push(it);
            if (pageData.length < respPageSize) break;
            page += 1;
            if (page > 200) break;
          }
          return { success: true, data: collected };
        } catch (e) {
        }
      }

      return { success: true, data: data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy danh sách hàng tồn kho' };
    }
  },

  // Lấy hàng tồn kho theo ID
  getInventoryById: async (id) => {
    try {
      const response = await api.get(`/inventory/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy thông tin hàng tồn kho' };
    }
  },

  // Tạo hàng tồn kho mới
  createInventory: async (inventoryData) => {
    try {
      const response = await api.post('/inventory', inventoryData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi tạo hàng tồn kho mới' };
    }
  },

  // Cập nhật hàng tồn kho
  updateInventory: async (id, inventoryData) => {
    try {
      const response = await api.put(`/inventory/${id}`, inventoryData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật hàng tồn kho' };
    }
  },

  // Xóa hàng tồn kho
  deleteInventory: async (id) => {
    try {
      await api.delete(`/inventory/${id}`);
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Lỗi xóa hàng tồn kho' };
    }
  },

  // Lấy hàng sắp hết
  getLowStockItems: async () => {
    try {
      const response = await api.get('/inventory');
      const lowStockItems = response.data.filter(item => 
        item.quantity <= item.minQuantity
      );
      return { success: true, data: lowStockItems };
    } catch (error) {
      return { success: false, message: 'Lỗi lấy hàng sắp hết' };
    }
  },

  // Cập nhật số lượng hàng tồn kho
  updateQuantity: async (id, quantity) => {
    try {
      const response = await api.patch(`/inventory/${id}`, { quantity });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Lỗi cập nhật số lượng' };
    }
  }
};
