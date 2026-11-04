import api from "./axios";

export const authService = {
    // POST login
  login: async (credentials) => {
    const response = await api.post('auth/login', credentials)
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data;
  }
}