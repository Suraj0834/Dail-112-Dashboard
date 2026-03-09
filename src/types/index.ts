// =============================================================================
// types/index.ts - Shared TypeScript Interfaces
// These mirror the MongoDB models on the existing backend
// =============================================================================

// ── Auth & Users ─────────────────────────────────────────────────────────────

export type UserRole = 'citizen' | 'police' | 'admin' | 'control_room';

export interface User {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    badgeId?: string;
    station?: string;
    rank?: string;
    profileImage?: string | null;
    isActive: boolean;
    isOnDuty?: boolean;
    dutyShift?: 'Morning' | 'Evening' | 'Night' | null;
    dutyStartedAt?: string | null;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthResponse {
    success: boolean;
    token: string;
    user: User;
}

// ── Cases / FIR ───────────────────────────────────────────────────────────────

export type CaseStatus = 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';

export type CrimeType =
    | 'THEFT'
    | 'CYBERCRIME'
    | 'VIOLENCE'
    | 'FRAUD'
    | 'HARASSMENT'
    | 'ACCIDENT'
    | 'OTHER';

export interface GeoPoint {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
}

export interface CaseTimeline {
    action: string;
    note?: string;
    updatedAt: string;
    updatedBy?: string;
}

export interface Case {
    _id: string;
    title: string;
    description: string;
    category: CrimeType;
    status: CaseStatus;
    filedBy: string | User;
    assignedOfficer?: string | User;
    suspect?: string | { _id: string; name: string; dangerLevel?: string; photo?: string; category?: string };
    location: GeoPoint & { address?: string };
    imageUrl?: string | null;
    timeline: CaseTimeline[];
    aiCategory?: string;
    aiConfidence?: number;
    createdAt: string;
    updatedAt: string;
}

// ── SOS Logs ──────────────────────────────────────────────────────────────────

export type SosStatus = 'ACTIVE' | 'RESPONDED' | 'RESOLVED' | 'FALSE_ALARM';
export type SosType = 'SOS' | 'ACCIDENT' | 'FIRE' | 'MEDICAL' | 'SOS_UPDATE';

export interface SosLog {
    _id: string;
    triggeredBy: string | User;
    location: GeoPoint;
    address?: string;
    type: SosType;
    status: SosStatus;
    respondingOfficer?: string | User;
    createdAt: string;
}

// ── Criminals ─────────────────────────────────────────────────────────────────

export type DangerLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CrimeHistoryEntry {
    offense: string;
    date?: string;
    caseId?: string;
}

export interface Criminal {
    _id: string;
    name: string;
    age?: number;
    gender?: string;
    photo?: string;
    crimeHistory: CrimeHistoryEntry[];
    dangerLevel: DangerLevel;
    warrantStatus: boolean;
    lastKnownAddress?: string;
    isActive: boolean;
    hasEmbedding?: boolean;   // true = face is indexed and searchable
    createdAt: string;
}

// ── Vehicles ──────────────────────────────────────────────────────────────────

export interface Vehicle {
    _id: string;
    plateNumber: string;
    ownerName: string;
    ownerPhone?: string;
    vehicleType: string;
    model: string;
    color: string;
    isStolen: boolean;
    isSuspected: boolean;
    linkedCases?: string[];
    createdAt: string;
}

// ── Hotspots ──────────────────────────────────────────────────────────────────

export interface Hotspot {
    latitude: number;
    longitude: number;
    riskScore: number;  // 0.0 – 1.0
    crimeCount: number;
    area: string;
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export interface DashboardStats {
    totalCases: number;
    activeCases: number;
    sosToday: number;
    policeOnDuty: number;
    totalPolice: number;
    totalCriminals: number;
    casesThisMonth: number;
    resolvedThisMonth: number;
}

export interface MonthlyTrend {
    month: string;
    cases: number;
    resolved: number;
}

export interface CrimeDistribution {
    type: CrimeType | string;
    count: number;
}

// ── AI ────────────────────────────────────────────────────────────────────────

export interface FaceRecognitionResult {
    success: boolean;
    match: boolean;
    criminalId?: string;
    name?: string;
    confidence: number;
    crimeHistory?: string[];
    dangerLevel?: DangerLevel;
    message: string;
}

export interface AnprResult {
    success: boolean;
    plateNumber?: string;
    confidence: number;
    message: string;
}

export interface WeaponDetection {
    success: boolean;
    weaponDetected: boolean;
    detections: Array<{
        label: string;
        confidence: number;
        bbox: number[];
    }>;
    message: string;
}

export interface ComplaintCategory {
    success: boolean;
    category: string;
    confidence: number;
    allScores: Record<string, number>;
}

// ── Socket.IO Events ──────────────────────────────────────────────────────────

export interface SosNewEvent {
    sosId: string;
    citizen: Pick<User, '_id' | 'name' | 'phone'>;
    location: GeoPoint;
    address?: string;
    type: SosType;
    timestamp: string;
}

export interface CaseUpdateEvent {
    caseId: string;
    status: CaseStatus;
    updatedBy: string;
    note?: string;
    timestamp: string;
}

export interface PcrLocationEvent {
    officerId: string;
    latitude: number;
    longitude: number;
    status: 'Available' | 'Busy';
    timestamp: string;
}

export interface NotificationEvent {
    id: string;
    type: 'sos' | 'case' | 'weapon' | 'system';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
}

// ── PCR Van ───────────────────────────────────────────────────────────────────

export interface PcrVan {
    _id: string;
    vehicleName: string;
    plateNo: string;
    model?: string;
    color?: string;
    station?: string;
    assignedOfficer?: string | User | null;
    coDriver?: string | User | null;
    status: 'Available' | 'Busy' | 'Off-Duty' | 'Maintenance';
    isVisible: boolean;
    location?: {
        type: 'Point';
        coordinates: [number, number];   // [lng, lat]
        address?: string;
    };
    lastSeen?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// ── API Response Envelope ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    page: number;
    pages: number;
}
