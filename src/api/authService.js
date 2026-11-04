import api from "./axios";

export const authService = {
  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  getCurrentUser: async (token) => {
    const response = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  logout: async (token) => {
    const response = await api.post("/auth/logout", undefined, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};