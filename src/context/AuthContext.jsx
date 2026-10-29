import { useState, createContext, useContext } from "react"

export const AuthContext = createContext(null);

// School-project demo account: authentication is intentionally frontend-only.
export const TEST_LOGIN = {
    email: "admin@pms.test",
    password: "superadmin123",
};

const TEST_USER = {
    id: "DEMO-SUPER-ADMIN-001",
    name: "Development Officer",
    role: "Officer-in-Charge",
    facility: "Main Prison",
};

function savedSession() {
    return localStorage.getItem("demo-authenticated") === "true" ||
        sessionStorage.getItem("demo-authenticated") === "true";
}

export function AuthProvider({children}) {
    const [user, setUser] = useState(() => savedSession() ? TEST_USER : null)
    const [loading, setLoading] = useState(false);


    const login = async (credentials) => {
    setLoading(true)
    try {
        const email = credentials.email.trim().toLowerCase();
        if (email !== TEST_LOGIN.email || credentials.password !== TEST_LOGIN.password) {
            throw new Error("Invalid email or password");
        }

        localStorage.removeItem("demo-authenticated");
        sessionStorage.removeItem("demo-authenticated");
        const storage = credentials.rememberMe ? localStorage : sessionStorage;
        storage.setItem("demo-authenticated", "true");
        setUser(TEST_USER);
        return { user: TEST_USER };
    } finally {
        setLoading(false)
    }};

    const logout = () => {
        setUser(null)
        localStorage.removeItem("demo-authenticated")
        sessionStorage.removeItem("demo-authenticated")
    }

    return (
        <AuthContext.Provider value={{user, isAuthenticated: !!user, loading, login, logout}}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
 
