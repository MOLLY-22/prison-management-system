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
        try {
            const response = await api.get('/users');
            return response.data;
        } catch {
            return INITIAL_MOCK_USERS;
        }
    },

    createUser: async (userData) => {
        try {
            const response = await api.post('/users', userData);
            return response.data;
        } catch {
            return INITIAL_MOCK_USERS;
        }
    },
    updateUserRole: async (id, newRole) => {
        try {
            const response = await api.patch(`/users/${id}/role`, { role: newRole });
            return response.data;
        } catch {
            return {id, role: newRole};
        }
    },

    updateUser: async (userData) => {
        try {
            const response = await api.patch(`/users/${userData.id}`, userData);
            return response.data;
        } catch {
            return userData;
        }
    },

    deleteUser: async (id) => {
        try {
            await api.delete(`/users/${id}`);
        } catch {
            // Silent fail - user not found or already deleted
            console.log(`User with id ${id} not found or already deleted`);
        }
    },
};
