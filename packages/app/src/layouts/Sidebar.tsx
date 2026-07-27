import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Network, BookOpen, Cpu, Sliders, User, LogOut, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import VigilLogo from '../components/ui/VigilLogo';

export const Sidebar: React.FC = () => {
    const { incidents, user, setUser } = useApp();

    const activeIncidentsCount = incidents.filter((i) => i.status === 'reviewing').length;
    const isCompleted = localStorage.getItem('vigil_onboarding_completed') === 'true';

    return (
        <aside className="w-64 bg-[#0d0f14]/90 backdrop-blur-xl border-r border-surface-container-high/60 flex flex-col justify-between flex-shrink-0 z-20 select-none">
            <div>
                {/* Brand Logo & Connection Info */}
                <div className="p-5 border-b border-surface-container-high/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <VigilLogo height={24} color="#FFFFFF" />
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            LIVE
                        </span>
                    </div>
                    <span className="text-[10px] text-secondary/70 font-mono tracking-wider block">
                        OBSERVABILITY CO-PILOT
                    </span>
                </div>

                {/* Navigation Items */}
                <nav className="p-3.5 space-y-6">
                    {/* Section 1: Observability Command */}
                    <div className="space-y-1">
                        <div className="px-3 pb-1.5 text-[10px] font-bold text-secondary/50 uppercase tracking-widest font-mono">
                            Observability Command
                        </div>

                        <NavLink
                            to="/incidents"
                            className={({ isActive }) =>
                                `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-primary/15 text-primary border-l-2 border-primary font-bold shadow-sm'
                                        : 'text-secondary/80 hover:text-white hover:bg-surface-container-high/40'
                                }`
                            }
                        >
                            <Activity className="w-4 h-4 flex-shrink-0" />
                            <span>Incidents Monitor</span>
                            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono bg-surface-container-high text-secondary flex items-center gap-1">
                                {activeIncidentsCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-status-critical animate-pulse" />}
                                {activeIncidentsCount}
                            </span>
                        </NavLink>

                        <NavLink
                            to="/topology"
                            className={({ isActive }) =>
                                `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-primary/15 text-primary border-l-2 border-primary font-bold shadow-sm'
                                        : 'text-secondary/80 hover:text-white hover:bg-surface-container-high/40'
                                }`
                            }
                        >
                            <Network className="w-4 h-4 flex-shrink-0" />
                            <span>Service Topology</span>
                        </NavLink>

                        <NavLink
                            to="/runbooks"
                            className={({ isActive }) =>
                                `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-primary/15 text-primary border-l-2 border-primary font-bold shadow-sm'
                                        : 'text-secondary/80 hover:text-white hover:bg-surface-container-high/40'
                                }`
                            }
                        >
                            <BookOpen className="w-4 h-4 flex-shrink-0" />
                            <span>Runbook KB</span>
                        </NavLink>

                        <NavLink
                            to="/evals"
                            className={({ isActive }) =>
                                `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-primary/15 text-primary border-l-2 border-primary font-bold shadow-sm'
                                        : 'text-secondary/80 hover:text-white hover:bg-surface-container-high/40'
                                }`
                            }
                        >
                            <Cpu className="w-4 h-4 flex-shrink-0" />
                            <span>Agent Eval Suite</span>
                        </NavLink>
                    </div>

                    {/* Section 2: Workspace & Integration */}
                    <div className="space-y-1">
                        <div className="px-3 pb-1.5 text-[10px] font-bold text-secondary/50 uppercase tracking-widest font-mono flex items-center justify-between">
                            <span>System Setup</span>
                            {isCompleted && (
                                <span className="text-emerald-400 flex items-center gap-1 font-sans text-[9px] lowercase font-normal">
                                    <ShieldCheck className="w-3 h-3" /> configured
                                </span>
                            )}
                        </div>

                        <NavLink
                            to="/onboarding"
                            className={({ isActive }) =>
                                `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-primary/15 text-primary border-l-2 border-primary font-bold shadow-sm'
                                        : 'text-secondary/80 hover:text-white hover:bg-surface-container-high/40'
                                }`
                            }
                        >
                            <Sliders className="w-4 h-4 flex-shrink-0" />
                            <span>Setup & Telemetry</span>
                        </NavLink>
                    </div>
                </nav>
            </div>

            {/* User Card Footer */}
            <div className="p-3.5 border-t border-surface-container-high/50 bg-[#111318]/60 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative flex-shrink-0">
                        {user?.picture ? (
                            <img 
                                src={user.picture} 
                                alt={user.name || 'User Profile'} 
                                className="w-8 h-8 rounded-full object-cover border border-surface-container-high" 
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-secondary border border-surface-container-highest">
                                <User className="w-4 h-4" />
                            </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#111318]" />
                    </div>

                    <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">{user?.name || 'SRE Operator'}</p>
                        <p className="text-[10px] text-secondary/70 truncate font-mono">{user?.email || 'oncall@vigil.local'}</p>
                    </div>
                </div>

                <button
                    onClick={async () => {
                        try {
                            await fetch('/api/auth/logout', { method: 'POST' });
                        } catch (err) {
                            console.error('Logout request failed', err);
                        }
                        setUser(null);
                    }}
                    title="Sign Out"
                    className="text-secondary/70 hover:text-status-critical p-2 rounded-lg hover:bg-surface-container-high/40 transition-all flex-shrink-0"
                >
                    <LogOut className="w-3.5 h-3.5" />
                </button>
            </div>
        </aside>
    );
};
