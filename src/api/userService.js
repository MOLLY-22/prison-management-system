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

    // POST create user
    createUser: async(userData) => {
        try {
            const response = await api.post('/users', userData)
            return response.data
        } catch (error) {
            console.error('Error creating user:', error)
            throw error
        }
    },

    getUserById: async(id) => {
        const response = await api.get(`/users/${id}`)
        return response.data
    }
}
