// =============================================================================
// context/SocketContext.tsx - Shared Socket.IO connection
// Re-uses the existing backend Socket.IO events
// =============================================================================

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useRef,
    ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import {
    SosNewEvent,
    CaseUpdateEvent,
    PcrLocationEvent,
    NotificationEvent,
} from '../types';
import toast from 'react-hot-toast';

interface SocketContextValue {
    socket: Socket | null;
    connected: boolean;
    notifications: NotificationEvent[];
    unreadCount: number;
    markAllRead: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const { token } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!token) {
            socketRef.current?.disconnect();
            return;
        }

        // Connect with JWT auth handshake (existing backend pattern)
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            console.log('[Socket] Connected:', socket.id);
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        // ── SOS: New emergency alert ──────────────────────────────────────────────
        socket.on('sos_alert', (data: SosNewEvent) => {
            // Play alert sound
            try {
                const audio = new Audio('/sounds/sos-alert.mp3');
                audio.play().catch(() => { });
            } catch (_) { }

            const notif: NotificationEvent = {
                id: data.sosId,
                type: 'sos',
                title: '🚨 SOS Alert!',
                message: `${data.citizen.name} needs help at ${data.address || 'unknown location'}`,
                timestamp: data.timestamp,
                read: false,
            };

            setNotifications((prev) => [notif, ...prev.slice(0, 49)]);
            setUnreadCount((c) => c + 1);

            toast.error(`🚨 SOS from ${data.citizen.name}`, {
                duration: 8000,
                position: 'top-right',
            });
        });

        // ── Case update notification ──────────────────────────────────────────────
        socket.on('case_updated', (data: CaseUpdateEvent) => {
            const notif: NotificationEvent = {
                id: `case_${data.caseId}_${Date.now()}`,
                type: 'case',
                title: 'Case Updated',
                message: `Case status changed to ${data.status}`,
                timestamp: data.timestamp,
                read: false,
            };
            setNotifications((prev) => [notif, ...prev.slice(0, 49)]);
            setUnreadCount((c) => c + 1);
        });

        // ── Weapon detected ───────────────────────────────────────────────────────
        socket.on('weapon_alert', (data: { officerId: string; timestamp: string }) => {
            const notif: NotificationEvent = {
                id: `weapon_${Date.now()}`,
                type: 'weapon',
                title: '⚠️ Weapon Detected',
                message: 'AI system detected a potential weapon',
                timestamp: data.timestamp,
                read: false,
            };
            setNotifications((prev) => [notif, ...prev.slice(0, 49)]);
            setUnreadCount((c) => c + 1);

            toast.error('⚠️ Weapon Detected by AI!', { duration: 6000, position: 'top-right' });
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
            setConnected(false);
        };
    }, [token]);

    const markAllRead = () => {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    return (
        <SocketContext.Provider
            value={{
                socket: socketRef.current,
                connected,
                notifications,
                unreadCount,
                markAllRead,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = (): SocketContextValue => {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error('useSocket must be within <SocketProvider>');
    return ctx;
};
