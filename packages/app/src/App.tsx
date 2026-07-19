import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppContextProvider, useApp } from './context/AppContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { IncidentsMonitor } from './features/incidents/components/IncidentsMonitor';
import { TopologyGraph } from './features/topology/components/TopologyGraph';
import { RunbookSearch } from './features/runbooks/components/RunbookSearch';
import { EvalSuite } from './features/evals/components/EvalSuite';
import { Login } from './features/auth/components/Login';

function AppContent() {
    const { user, setUser } = useApp();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error("Auth check failed", err);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, [setUser]);

    if (isLoading) {
        return (
            <div className="min-h-screen w-screen bg-[#0c0e13] flex items-center justify-center text-white font-sans">
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-sm font-semibold tracking-wide text-secondary uppercase animate-pulse">Verifying credentials...</p>
                </div>
            </div>
        );
    }

    const isAuthenticated = user !== null;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    return (
        <BrowserRouter basename={isLocalhost ? '' : '/app'}>
            <Routes>
                <Route 
                    path="/login" 
                    element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
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
    );
}

export default function App() {
    return (
        <AppContextProvider>
            <AppContent />
        </AppContextProvider>
    );
}
