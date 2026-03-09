// =============================================================================
// services/api.service.ts - All API calls to the existing Node.js backend
// Follows clean service pattern (no axios calls scattered in components)
// =============================================================================

import api from '../utils/axios';
import type {
    Case,
    SosLog,
    User,
    Criminal,
    Vehicle,
    Hotspot,
    DashboardStats,
    MonthlyTrend,
    CrimeDistribution,
    AuthResponse,
    FaceRecognitionResult,
    AnprResult,
    WeaponDetection,
    ComplaintCategory,
    PcrVan,
} from '../types';

// =============================================================================
// AUTH SERVICE
// =============================================================================

export const authService = {
    login: (email: string, password: string) =>
        api.post<AuthResponse>('/auth/login', { email, password }),

    register: (data: Partial<User> & { password: string }) =>
        api.post<AuthResponse>('/auth/register', data),

    getProfile: () => api.get<{ success: boolean; user: User }>('/auth/profile'),
};

// =============================================================================
// DASHBOARD SERVICE
// Aggregation endpoints – add to existing backend (see backend extension below)
// =============================================================================

export const dashboardService = {
    getStats: () =>
        api.get<{ success: boolean; data: DashboardStats }>('/portal/dashboard/stats'),

    getMonthlyTrends: (range = 'months') =>
        api.get<{ success: boolean; data: MonthlyTrend[] }>(`/portal/dashboard/trends?range=${range}`),

    getCrimeDistribution: (range = 'months') =>
        api.get<{ success: boolean; data: CrimeDistribution[] }>(`/portal/dashboard/crime-distribution?range=${range}`),

    getStatusBreakdown: (range = 'months') =>
        api.get<{ success: boolean; data: { status: string; count: number }[] }>(`/portal/dashboard/status-breakdown?range=${range}`),

    getDayBreakdown: (range = 'months') =>
        api.get<{ success: boolean; data: { day: string; incidents: number }[] }>(`/portal/dashboard/day-breakdown?range=${range}`),
};

// =============================================================================
// CASES SERVICE
// =============================================================================

export const casesService = {
    getAll: (params?: {
        status?: string;
        category?: string;
        page?: number;
        limit?: number;
        search?: string;
    }) => api.get<{ success: boolean; cases: Case[]; total: number; pages: number }>('/portal/cases', { params }),

    getById: (id: string) =>
        api.get<{ success: boolean; case: Case }>(`/portal/cases/${id}`),

    updateStatus: (id: string, status: string, note?: string) =>
        api.patch<{ success: boolean; case: Case }>(`/portal/cases/${id}/status`, { status, note }),

    assignOfficer: (id: string, officerId: string) =>
        api.patch<{ success: boolean; case: Case }>(`/portal/cases/${id}/assign`, { officerId }),
};

// =============================================================================
// SOS SERVICE
// =============================================================================

export const sosService = {
    getAll: (params?: { status?: string; page?: number; limit?: number }) =>
        api.get<{ success: boolean; data: SosLog[]; total: number }>('/portal/sos', { params }),

    dispatch: (sosId: string, officerId: string) =>
        api.post(`/portal/sos/${sosId}/dispatch`, { officerId }),

    resolve: (sosId: string) =>
        api.put(`/portal/sos/${sosId}/resolve`),
};

// =============================================================================
// POLICE / USERS SERVICE
// =============================================================================

export const policeService = {
    getAll: (params?: { station?: string; isActive?: boolean; page?: number }) =>
        api.get<{ success: boolean; officers: User[]; total: number }>('/portal/police', { params }),

    getById: (id: string) =>
        api.get<{ success: boolean; officer: User }>(`/portal/police/${id}`),

    create: (data: FormData) =>
        api.post<{ success: boolean; officer: User }>('/portal/police', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    update: (id: string, data: Partial<User>) =>
        api.put<{ success: boolean; officer: User }>(`/portal/police/${id}`, data),

    toggleActive: (id: string, isActive: boolean) =>
        api.patch(`/portal/police/${id}/status`, { isActive }),

    toggleDuty: (id: string, isOnDuty: boolean, dutyShift?: string | null) =>
        api.patch(`/portal/police/${id}/duty`, { isOnDuty, dutyShift }),

    resetPassword: (id: string, newPassword: string) =>
        api.patch(`/portal/police/${id}/password`, { newPassword }),

    getPerformance: (id: string) =>
        api.get(`/portal/police/${id}/performance`),
};

// =============================================================================
// CRIMINALS SERVICE
// =============================================================================

export const criminalsService = {
    getAll: (params?: { page?: number; limit?: number; search?: string }) =>
        api.get<{ success: boolean; criminals: Criminal[]; total: number }>('/portal/criminals', { params }),

    getById: (id: string) =>
        api.get<{ success: boolean; criminal: Criminal }>(`/portal/criminals/${id}`),

    create: (data: FormData) =>
        api.post<{ success: boolean; criminal: Criminal }>('/portal/criminals', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    update: (id: string, data: Partial<Criminal>) =>
        api.put(`/portal/criminals/${id}`, data),

    updatePhoto: (id: string, file: File) => {
        const form = new FormData();
        form.append('photo', file);
        return api.put(`/portal/criminals/${id}/photo`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    reindex: (id: string) =>
        api.post(`/portal/criminals/${id}/reindex`),

    addCrimeHistory: (id: string, offense: string, caseId?: string) =>
        api.post(`/portal/criminals/${id}/history`, { offense, caseId }),
};

// =============================================================================
// VEHICLES SERVICE
// =============================================================================

export const vehiclesService = {
    getAll: (params?: { isStolen?: boolean; page?: number; search?: string }) =>
        api.get<{ success: boolean; vehicles: Vehicle[]; total: number }>('/portal/vehicles', { params }),

    getByPlate: (plateNumber: string) =>
        api.get<{ success: boolean; vehicle: Vehicle }>(`/portal/vehicles/plate/${plateNumber}`),

    create: (data: Partial<Vehicle>) =>
        api.post<{ success: boolean; vehicle: Vehicle }>('/portal/vehicles', data),

    update: (id: string, data: Partial<Vehicle>) =>
        api.put(`/portal/vehicles/${id}`, data),

    flagStolen: (id: string, isStolen: boolean) =>
        api.patch(`/portal/vehicles/${id}/stolen`, { isStolen }),
};

// =============================================================================
// AI SERVICE (proxy through existing /api/ai routes)
// =============================================================================

export const aiService = {
    recognizeFace: (file: File) => {
        const form = new FormData();
        form.append('file', file);
        return api.post<FaceRecognitionResult>('/ai/face-recognition', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    detectPlate: (file: File) => {
        const form = new FormData();
        form.append('file', file);
        return api.post<AnprResult>('/ai/anpr', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    detectWeapon: (file: File) => {
        const form = new FormData();
        form.append('file', file);
        return api.post<WeaponDetection>('/ai/detect-weapon', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    classifyComplaint: (text: string) =>
        api.post<ComplaintCategory>('/ai/classify-complaint', { text }),

    getHotspots: () =>
        api.get<{ success: boolean; hotspots: Hotspot[] }>('/ai/hotspots'),
};

// =============================================================================
// ROLES SERVICE
// =============================================================================

export const rolesService = {
    getAll: () =>
        api.get<{ success: boolean; roles: any[] }>('/portal/roles'),

    getById: (id: string) =>
        api.get<{ success: boolean; role: any }>(`/portal/roles/${id}`),

    create: (data: { name: string; displayName: string; description?: string; permissions?: string[] }) =>
        api.post('/portal/roles', data),

    update: (id: string, data: Record<string, any>) =>
        api.put(`/portal/roles/${id}`, data),

    delete: (id: string) =>
        api.delete(`/portal/roles/${id}`),

    getAllPermissions: () =>
        api.get<{ success: boolean; permissions: string[] }>('/portal/roles/permissions/all'),
};

// =============================================================================
// PCR VAN SERVICE
// =============================================================================

export const pcrService = {
    getAll: (params?: { station?: string; status?: string; isVisible?: boolean }) =>
        api.get<{ success: boolean; vans: PcrVan[]; total: number }>('/portal/pcr-vans', { params }),

    getById: (id: string) =>
        api.get<{ success: boolean; van: PcrVan }>(`/portal/pcr-vans/${id}`),

    create: (data: Partial<PcrVan> & { assignedOfficer?: string; coDriver?: string }) =>
        api.post<{ success: boolean; van: PcrVan }>('/portal/pcr-vans', data),

    update: (id: string, data: Partial<PcrVan> & { assignedOfficer?: string | null; coDriver?: string | null }) =>
        api.put<{ success: boolean; van: PcrVan }>(`/portal/pcr-vans/${id}`, data),

    delete: (id: string) =>
        api.delete(`/portal/pcr-vans/${id}`),

    setVisibility: (id: string, isVisible: boolean) =>
        api.patch(`/portal/pcr-vans/${id}/visibility`, { isVisible }),

    setStatus: (id: string, status: PcrVan['status']) =>
        api.patch(`/portal/pcr-vans/${id}/status`, { status }),

    reassignOfficer: (id: string, officerId: string | null) =>
        api.patch(`/portal/pcr-vans/${id}/officer`, { officerId }),
};
