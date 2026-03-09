// =============================================================================
// utils/axios.ts - Axios instance configured to talk to the existing backend
// Automatically attaches JWT from localStorage to every request
// =============================================================================

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api: AxiosInstance = axios.create({
    baseURL: `${BASE_URL}/api`,
    timeout: 30_000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request interceptor: attach Bearer token ─────────────────────────────────
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('dial112_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ────────────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('dial112_token');
            localStorage.removeItem('dial112_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
