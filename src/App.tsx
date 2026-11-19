import Dashboard from "./Dashboard/Dashboard";
import { AuthProvider } from "./context/AuthContext";
import { BrowserRouter } from "react-router-dom";

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Dashboard />
            </AuthProvider>
        </BrowserRouter>
    );
}
