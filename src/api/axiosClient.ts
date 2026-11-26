import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.DEV
        ? "/api/v1"
        : import.meta.env.VITE_API_BASE_URL || "/api/v1",
    timeout: 10000,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
    paramsSerializer: {
        indexes: null,
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) 
        config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (
            axios.isAxiosError(error) &&
            error.response?.status === 401 &&
            !error.config?.url?.includes("/auth/login")
        ) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("user");
            window.dispatchEvent(new Event("pms:session-expired"));
        }
        return Promise.reject(error);
    },
);

export default api;
