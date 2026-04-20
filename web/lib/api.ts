import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_DIET_API_URL || 'http://localhost:3000';
const API_KEY = process.env.DIET_API_KEY;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'X-API-Key': API_KEY }),
  },
});

// Plans endpoints
export const plans = {
  getAll: () => apiClient.get('/api/plans'),
  getToday: () => apiClient.get('/api/plans/today'),
  getDay: (dayOfWeek: number) => apiClient.get(`/api/plans/day/${dayOfWeek}`),
  getMeal: (mealType: string) => apiClient.get(`/api/plans/meal/${mealType}`),
  create: (data: any) => apiClient.post('/api/plans', data),
  delete: () => apiClient.delete('/api/plans'),
  updateMeal: (mealId: string, data: any) => apiClient.patch(`/api/plans/meal/${mealId}`, data),
  updateDay: (dayOfWeek: number, data: any) => apiClient.patch(`/api/plans/day/${dayOfWeek}`, data),
  uploadPDF: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/plans/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Compliance endpoints (placeholder - aggiunti in Sprint 1)
export const compliance = {
  log: (data: any) => apiClient.post('/api/compliance', data),
  getRange: (startDate: string, endDate: string) =>
    apiClient.get('/api/compliance', { params: { startDate, endDate } }),
  getToday: () => apiClient.get('/api/compliance/today'),
  getStreak: () => apiClient.get('/api/compliance/streak'),
};

export default apiClient;
