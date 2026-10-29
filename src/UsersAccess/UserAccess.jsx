import { useState, useEffect } from "react";
import { userService, INITIAL_MOCK_USERS } from "../api/userService";

export default function UserAccess() {
    const [users, setUsers] = useState(INITIAL_MOCK_USERS);
    const [isActive, setIsActive] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", role: "Viewer", status: "Active" });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // TODO: Fetch users from API
        async function loadUsers() {
            setLoading(true);
            const data = await userService.getUsers();
            setUsers(data);
            setLoading(false);
        }
        loadUsers();
    }, []);


    const addUser = () => {
        if(!newUser.name || !newUser.email) return;

        const createdUser = {
            id: Date.now().toString(),
            ...newUser,
            status: 'Active'
        };
        
        setUsers((currentUsers) => [...currentUsers, createdUser]);
        setNewUser({ name: "", email: "", role: "Viewer", status: "Active" });
    };

    //Delete user function
    const deleteUser = async (id) => {
        setUsers((prev) => prev.filter(user => user.id !== id));
        await userService.deleteUser(id);
    }
    

    const handleActivate = () => {
        setIsActive(!isActive);
    }

    const filteredUsers = users.filter(
        (user) =>
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            user.role.toLowerCase().includes(search.toLowerCase())
    );


    return (
        <div>
            {/* navbar */}
            <div className="flex justify-between items-center mb-4 mx-4 py-4">
                <h1 className="text-2xl font-bold">Users & Access Management</h1>
               <div>
                <input type="text" placeholder="Search by name, email" className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-2" value={search} onChange={(e) => setSearch(e.target.value)} />
                 <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={addUser}>Add User</button>
               </div>
            </div>

            {/* Add user popup */}
            <div className="bg-white p-4 rounded shadow mx-4 my-4 border border-gray-200 flex flex-col gap-2 max-w-md mx-auto">
                <label htmlFor="name">Name</label>
                <input className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" type="text" id="name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />

                <label htmlFor="email">Email</label>
                <input className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" type="email" id="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />

                <label htmlFor="role">Role</label>
                <select className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" id="role" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="default">Select Role</option>
                    <option value="Admin">Admin</option>
                    <option value="User">User</option>
                </select>
            </div>
            
            {/* table */}
            <div className="mx-auto"   >
                <table className="w-full gap-2">
                    <thead>
                        <tr>
                            <th className="text-left">Name</th>
                            <th className="text-left">Email</th>
                            <th className="text-left">Role</th>
                            <th className="text-left">Status</th>
                            <th className="text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7">Loading users…</td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.role}</td>
                                <td>{user.status}</td>
                                <td><button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={() => deleteUser(user.id)}>Delete</button></td>
                                {isActive ? (
                                    <td><button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={handleActivate}>Deactivate</button></td>
                                ) : (
                                    <td><button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={handleActivate}>Activate</button></td>
                                )}
                                <td><button className="bg-blue-500 text-white px-2 py-1 rounded">Edit</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}