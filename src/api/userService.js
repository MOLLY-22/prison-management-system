import api from './axios'; 

//Mockup data

export const INITIAL_MOCK_USERS = [
    {
        id: 1,
        name: "Commander John Davis",
        badgeId: "SEC-00412",
        role: "Officer-in-Charge",
        facility: "Block A - Maximum",
        status: "Active"
    },
    {
        id: 2,
        name: "Sarah Miller",
        badgeId: "SEC-00891",
        role: "Security Officer",
        facility: "Block B - Medium",
        status: "Active"
    },
    {
        id: 3,
        name: "Robert King",    
        badgeId: "SEC-01104",
        role: "Prison Officer",
        facility: "Block C - General",
        status: "Active"
    },
    {
        id: 4,
        name: "Alan Lee",
        badgeId: "SEC-01459",
        role: "Security Officer",
        facility: "Block A - Maximum",
        status: "Active"
    }
];

export const userService = {
    getUsers: async () => {
        const response = await api.get('/users');
        return response.data;
    },

    createUser: async (userData) => {
        const response = await api.post('/users', userData);
        return response.data;
    },
    updateUserRole: async (id, newRole) => {
        const response = await api.patch(`/users/${id}/role`, { role: newRole });
        return response.data;
    },

    updateUser: async (userData) => {
        const response = await api.patch(`/users/${userData.id}`, userData);
        return response.data;
    },

    deleteUser: async (id) => {
        await api.delete(`/users/${id}`);
    },
};
