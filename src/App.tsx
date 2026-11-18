import Dashboard from "./Dashboard/Dashboard";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
    return (
        <AuthProvider>
            <Dashboard />
        </AuthProvider>
    );
}
