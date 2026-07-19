import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Network, BookOpen, Cpu, User, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Sidebar: React.FC = () => {
    const { incidents, user, setUser } = useApp();

    const activeIncidentsCount = incidents.filter((i) => i.status === 'reviewing').length;

    return (
        <aside className="w-64 bg-surface-container-low/60 backdrop-blur-md border-r border-surface-container-high/50 flex flex-col justify-between flex-shrink-0 z-10">
            <div>
                {/* Brand Logo & Connection Info */}
                <div className="p-6 flex items-center gap-3 border-b border-surface-container-high/40">
                    <div className="bg-primary text-on-primary w-9 h-9 rounded-lg flex items-center justify-center font-display text-xl font-bold shadow-md">
                        V
                    </div>
                    <div>
                        <h1 className="font-headline-md font-bold tracking-tight text-white leading-none">
                            Vigil
                        </h1>
                        <span className="text-xs text-secondary font-mono tracking-wider">
                            OBSERVABILITY CO-PILOT
                        </span>
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="p-4 space-y-1.5">
                    <NavLink
                        to="/incidents"
                        className={({ isActive }) =>
                            `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                isActive
                                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                                    : 'text-secondary hover:text-white hover:bg-surface-container-high/40'
                            }`
                        }
                    >
                        <Activity className="w-4 h-4" />
                        Incidents Monitor
                        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-mono bg-surface-container-high text-secondary">
                            {activeIncidentsCount}
                        </span>
                    </NavLink>

                    <NavLink
                        to="/topology"
                        className={({ isActive }) =>
                            `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                isActive
                                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                                    : 'text-secondary hover:text-white hover:bg-surface-container-high/40'
                            }`
                        }
                    >
                        <Network className="w-4 h-4" />
                        Service Topology
                    </NavLink>

                    <NavLink
                        to="/runbooks"
                        className={({ isActive }) =>
                            `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                isActive
                                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                                    : 'text-secondary hover:text-white hover:bg-surface-container-high/40'
                            }`
                        }
                    >
                        <BookOpen className="w-4 h-4" />
                        Runbook KB
                    </NavLink>

                    <NavLink
                        to="/evals"
                        className={({ isActive }) =>
                            `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                isActive
                                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                                    : 'text-secondary hover:text-white hover:bg-surface-container-high/40'
                            }`
                        }
                    >
                        <Cpu className="w-4 h-4" />
                        Agent Eval Suite
                    </NavLink>
                </nav>
            </div>

            {/* User Card with Logout Button */}
            <div className="p-4 border-t border-surface-container-high/40 bg-surface-container-low/30 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                    {user?.picture ? (
                        <img 
                            src={user.picture} 
                            alt={user.name || 'User Profile'} 
                            className="w-9 h-9 rounded-full object-cover border border-surface-container-high flex-shrink-0" 
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary border border-surface-container-high flex-shrink-0">
                            <User className="w-4 h-4" />
                        </div>
                    )}
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{user?.name || 'SRE Operator'}</p>
                        <p className="text-xs text-secondary truncate">{user?.email || 'oncall@vigil.local'}</p>
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
                    className="text-secondary hover:text-status-critical p-2 rounded-lg hover:bg-surface-container-high/40 transition-colors flex-shrink-0"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </aside>
    );
};
