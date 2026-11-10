import { createContext, useContext, useState } from "react";
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

export function AuthProvider({ children }: PropsWithChildren) {
    const [token, setToken] = useState(readStoredToken);
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState("");

    const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
        setLoading(true);
        setAuthError("");

        try {
            const data = await authService.login(credentials);
            if (!data?.token) {
                throw new Error("The auth service returned an invalid login response.");
            }

            clearStoredSession();
            const storage = credentials.rememberMe ? localStorage : sessionStorage;
            storage.setItem("token", data.token);
            if (data.user) storage.setItem("user", JSON.stringify(data.user));
            setToken(data.token);

            return data;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        const hadActiveToken = Boolean(token);

        clearStoredSession();
        setToken(null);
        setAuthError("");

        if (!hadActiveToken) return;

        try {
            await authService.logout();
        } catch {
            setAuthError("You are signed out, but the server session could not be revoked.");
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user: readStoredUser(),
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
