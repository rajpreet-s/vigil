import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppContextProvider } from './context/AppContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { IncidentsMonitor } from './features/incidents/components/IncidentsMonitor';
import { TopologyGraph } from './features/topology/components/TopologyGraph';
import { RunbookSearch } from './features/runbooks/components/RunbookSearch';
import { EvalSuite } from './features/evals/components/EvalSuite';
import { Login } from './features/auth/components/Login';

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('vigil_authenticated') === 'true';
    });

    const handleLogin = () => {
        localStorage.setItem('vigil_authenticated', 'true');
        setIsAuthenticated(true);
    };

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    return (
        <AppContextProvider>
            <BrowserRouter basename={isLocalhost ? '' : '/app'}>
                <Routes>
                    <Route 
                        path="/login" 
                        element={isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} 
                    />
                    
                    <Route 
                        path="/" 
                        element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" replace />}
                    >
                        {/* Redirect root to /incidents */}
                        <Route index element={<Navigate to="/incidents" replace />} />

                        {/* Tab/Route Pages */}
                        <Route path="incidents" element={<IncidentsMonitor />} />
                        <Route path="topology" element={<TopologyGraph />} />
                        <Route path="runbooks" element={<RunbookSearch />} />
                        <Route path="evals" element={<EvalSuite />} />

                        {/* Catch-all redirect to incidents */}
                        <Route path="*" element={<Navigate to="/incidents" replace />} />
                    </Route>

                    {/* Outer catch-all */}
                    <Route path="*" element={<Navigate to={isAuthenticated ? "/incidents" : "/login"} replace />} />
                </Routes>
            </BrowserRouter>
        </AppContextProvider>
    );
}
