import { useEffect, useRef, useState } from "react";
import { authService } from "../api/authService";
import { AuthContext } from "./authContext";

function readStoredToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function clearStoredSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(readStoredToken);
    const initialToken = useRef(token);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(Boolean(token));
    const [authError, setAuthError] = useState("");

    useEffect(() => {
        if (!token || token !== initialToken.current) {
            setIsInitializing(false);
            return undefined;
        }

        let cancelled = false;

        authService.getCurrentUser(token)
            .then((data) => {
                if (!data?.user) {
                    throw new Error("The auth service returned an invalid session.");
                }

                if (!cancelled) setUser(data.user);
            })
            .catch((error) => {
                if (cancelled) return;

                clearStoredSession();
                setToken(null);

                if (error.response?.status !== 401) {
                    setAuthError("Unable to verify your saved session. Please sign in again.");
                }
            })
            .finally(() => {
                if (!cancelled) setIsInitializing(false);
            });

        return () => {
            cancelled = true;
        };
    }, [token]);

    const login = async (credentials) => {
        setLoading(true);
        setAuthError("");

        try {
            const data = await authService.login(credentials);
            if (!data?.token || !data?.user) {
                throw new Error("The auth service returned an invalid login response.");
            }

            clearStoredSession();
            const storage = credentials.rememberMe ? localStorage : sessionStorage;
            storage.setItem("token", data.token);
            storage.setItem("user", JSON.stringify(data.user));
            setUser(data.user);
            setToken(data.token);

            return data;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        const activeToken = token;

        clearStoredSession();
        setUser(null);
        setToken(null);
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
                isAuthenticated: Boolean(token && user),
                loading,
                isInitializing,
                authError,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
