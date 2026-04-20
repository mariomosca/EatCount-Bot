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

// --- Types ---

export type ComplianceStatus = 'FULL' | 'PARTIAL' | 'OFF';

export interface ComplianceRecord {
  id: string;
  userId: string;
  date: string;
  status: ComplianceStatus;
  deviations?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

export interface Meal {
  id: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  targetKcal: number;
  description: string;
  details?: string | null;
}

export interface PlanDay {
  dayOfWeek: number;
  meals: Meal[];
}

export interface TodayPlanResponse {
  planName: string;
  dayName: string;
  dayOfWeek: number;
  meals: Meal[];
}

export interface FullPlan {
  id: string;
  name: string;
  days: PlanDay[];
}

export interface TargetResponse {
  targetKcal: number;
}

// --- Plans ---
export const plans = {
  getAll: () => apiClient.get<{ plan: FullPlan | null }>('/api/plans'),
  getToday: () => apiClient.get<TodayPlanResponse>('/api/plans/today'),
  getDay: (dayOfWeek: number) => apiClient.get<{ planName: string; dayName: string; dayOfWeek: number; meals: Meal[] }>(`/api/plans/day/${dayOfWeek}`),
  getMeal: (mealType: string) => apiClient.get<{ meal: Meal | null }>(`/api/plans/meal/${mealType}`),
  create: (data: unknown) => apiClient.post('/api/plans', data),
  delete: () => apiClient.delete('/api/plans'),
  updateMeal: (mealId: string, data: Partial<Pick<Meal, 'targetKcal' | 'description' | 'details'>>) =>
    apiClient.patch(`/api/plans/meal/${mealId}`, data),
  updateDay: (dayOfWeek: number, data: unknown) => apiClient.patch(`/api/plans/day/${dayOfWeek}`, data),
  uploadPDF: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/plans/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// --- Compliance ---
export const compliance = {
  log: (data: { status: ComplianceStatus; deviations?: string; note?: string; date?: string }) =>
    apiClient.post<{ success: boolean; compliance: ComplianceRecord }>('/api/compliance', data),
  getRange: (startDate: string, endDate: string) =>
    apiClient.get<{ records: ComplianceRecord[] }>('/api/compliance', { params: { startDate, endDate } }),
  getToday: () => apiClient.get<{ compliance: ComplianceRecord | null }>('/api/compliance/today'),
  getStreak: () => apiClient.get<StreakResult>('/api/compliance/streak'),
};

// --- Target ---
export const target = {
  get: () => apiClient.get<TargetResponse>('/api/target'),
  set: (targetKcal: number) => apiClient.put<TargetResponse>('/api/target', { targetKcal }),
};

export default apiClient;
