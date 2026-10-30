import apiClient from './axios.client';

export const adminAuditLogsApi = {
  getAuditLogs: async (params = {}) => {
    const response = await apiClient.get('/admin/audit-logs', { params });
    return response.data?.data || response.data;
  },

  getAuditLogById: async (auditLogId) => {
    const response = await apiClient.get(`/admin/audit-logs/${auditLogId}`);
    return response.data?.data || response.data;
  }
};

