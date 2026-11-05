import api from './axios'

export const  INITIAL_MOCK_INMATES =[
    
]

export const userService = {

    //GET all users
    getAllUsers: async () => {
        try {
            const response = await api.get('/users')
            return response.data
        } catch (error) {
            console.error('Error fetching users:', error)
            throw error
        }
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
