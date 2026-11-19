/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import type { PropsWithChildren } from "react";

import { authService } from "../api/authService";

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    role: string;
};

export type LoginCredentials = {
    username: string;
    password: string;
    rememberMe: boolean;
};

export type AuthResponse = {
    token: string;
    tokenType?: string;
    user?: AuthUser;
};

export type AuthContextValue = {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    isInitializing: boolean;
    authError: string;
    login: (credentials: LoginCredentials) => Promise<AuthResponse>;
    logout: () => Promise<void>;
};

 
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider.");
    }

    return context;
}

function readStoredToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function readStoredUser(): AuthUser | null {
    const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!stored) return null;
    try {
        return JSON.parse(stored) as AuthUser;
    } catch {
        return null;
    }
}

function clearStoredSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
}

function storeUser(storage: Storage, user: AuthUser) {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    storage.setItem("user", JSON.stringify(user));
}

export function AuthProvider({ children }: PropsWithChildren) {
    const [token, setToken] = useState(readStoredToken);
    const [user, setUser] = useState(readStoredUser);
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState("");

    useEffect(() => {
        const handleSessionExpired = () => {
            setToken(null);
            setUser(null);
            setAuthError("Your session expired. Sign in again to continue.");
        };
        window.addEventListener("pms:session-expired", handleSessionExpired);
        return () => window.removeEventListener("pms:session-expired", handleSessionExpired);
    }, []);

    
    const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
        setLoading(true);
        setAuthError("");

        try {
            const data = await authService.login(credentials) as AuthResponse;
            clearStoredSession();
            const storage = credentials.rememberMe ? localStorage : sessionStorage;
            storage.setItem("token", data.token);

            if (data.user) {
                storeUser(storage, data.user);
                setUser(data.user);
            } else {
                setUser(null);
            }

            setToken(data.token);
            setAuthError("");

            return { ...data};
        } catch (error) {
            clearStoredSession();
            setUser(null);
            setToken(null);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        const activeToken = token;

        clearStoredSession();
        setToken(null);
        setUser(null);
        setAuthError("");

        if (!activeToken) return;

        try {
            await authService.logout(activeToken);
        } catch {
            setAuthError("You are signed out, but the server session could not be revoked.");
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: Boolean(token),
                loading,
                isInitializing: false,
                authError,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
