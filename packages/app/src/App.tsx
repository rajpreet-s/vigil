import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppContextProvider } from './context/AppContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { IncidentsMonitor } from './features/incidents/components/IncidentsMonitor';
import { TopologyGraph } from './features/topology/components/TopologyGraph';
import { RunbookSearch } from './features/runbooks/components/RunbookSearch';
import { EvalSuite } from './features/evals/components/EvalSuite';

export default function App() {
    return (
        <AppContextProvider>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<DashboardLayout />}>
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
                </Routes>
            </HashRouter>
        </AppContextProvider>
    );
}
