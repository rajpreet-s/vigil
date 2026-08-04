import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Network, BookOpen, Cpu, Sliders, User, LogOut, ShieldCheck, Building2, ChevronDown, Check, Plus, UserPlus, Copy, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import VigilLogo from '../components/ui/VigilLogo';

export const Sidebar: React.FC = () => {
    const { incidents, user, setUser, activeOrg, userOrgs, switchOrg, createOrg, joinOrg } = useApp();

    const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    const [newOrgName, setNewOrgName] = useState('');
    const [inviteCodeInput, setInviteCodeInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedInvite, setCopiedInvite] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeIncidentsCount = incidents.filter((i) => i.status === 'reviewing').length;
    const isCompleted = localStorage.getItem('vigil_onboarding_completed') === 'true';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOrgDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrgName.trim()) return;
        setIsSubmitting(true);
        const success = await createOrg(newOrgName.trim());
        setIsSubmitting(false);
        if (success) {
            setNewOrgName('');
            setShowCreateModal(false);
            setIsOrgDropdownOpen(false);
        }
    };

    const handleJoinOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCodeInput.trim()) return;
        setIsSubmitting(true);
        const success = await joinOrg(inviteCodeInput.trim());
        setIsSubmitting(false);
        if (success) {
            setInviteCodeInput('');
            setShowJoinModal(false);
            setIsOrgDropdownOpen(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        if (!text) return false;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (err) {
            console.error('Clipboard copy failed:', err);
            return false;
        }
    };

    const handleCopyInvite = async () => {
        const codeToCopy = activeOrg?.invite_code || activeOrg?.api_key || activeOrg?.slug || '';
        if (!codeToCopy) return;
        const success = await copyToClipboard(codeToCopy);
        if (success) {
            setCopiedInvite(true);
            setTimeout(() => setCopiedInvite(false), 2000);
        }
    };

    return (
        <>
            <aside className="w-64 bg-[#0d0f14]/90 backdrop-blur-xl border-r border-surface-container-high/60 flex flex-col justify-between flex-shrink-0 z-20 select-none">
                <div>
                    {/* Brand Logo & Connection Info */}
                    <div className="p-5 border-b border-surface-container-high/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <VigilLogo height={24} color="#FFFFFF" />
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                LIVE
                            </span>
                        </div>

                        {/* Interactive Organization Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                                className="w-full flex items-center justify-between p-2 rounded-xl bg-[#13161f] hover:bg-surface-container-high/60 border border-surface-container-high/70 transition-all group"
                            >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
                                        <Building2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <div className="text-xs font-bold text-white truncate leading-snug">
                                            {activeOrg?.name || 'My Organization'}
                                        </div>
                                        <div className="text-[9px] font-mono text-secondary/70 truncate flex items-center gap-1">
                                            <span>Role: {activeOrg?.role || 'OWNER'}</span>
                                        </div>
                                    </div>
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-secondary transition-transform ${isOrgDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isOrgDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#111318] border border-surface-container-high rounded-xl shadow-2xl p-1.5 space-y-1 z-30 animate-fadeIn">
                                    <div className="px-2 py-1 text-[9px] font-mono text-secondary/60 uppercase tracking-wider">
                                        Your Organizations ({userOrgs.length})
                                    </div>

                                    <div className="max-h-40 overflow-y-auto space-y-0.5 pr-0.5">
                                        {userOrgs.map((org) => {
                                            const isActive = org.id === activeOrg?.id;
                                            return (
                                                <button
                                                    key={org.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (!isActive) switchOrg(org.id);
                                                        setIsOrgDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all ${
                                                        isActive
                                                            ? 'bg-primary/15 text-primary font-bold'
                                                            : 'text-secondary/80 hover:text-white hover:bg-surface-container-high/40'
                                                    }`}
                                                >
                                                    <span className="truncate pr-2">{org.name}</span>
                                                    {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="border-t border-surface-container-high/40 pt-1 space-y-0.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsOrgDropdownOpen(false);
                                                setShowCreateModal(true);
                                            }}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Create Organization</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsOrgDropdownOpen(false);
                                                setShowJoinModal(true);
                                            }}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-400/10 transition-all"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            <span>Join Organization</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsOrgDropdownOpen(false);
                                                setShowInviteModal(true);
                                            }}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-secondary hover:text-white hover:bg-surface-container-high/40 transition-all"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Invite Team Code</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
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

            {/* Modal: Create Organization */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-[#111318] border border-surface-container-high rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Plus className="w-4 h-4 text-primary" />
                                Create New Organization
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-secondary hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrg} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-white/80 mb-1.5">Organization Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newOrgName}
                                    onChange={(e) => setNewOrgName(e.target.value)}
                                    placeholder="e.g. Acme Corp Infrastructure"
                                    className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-xs font-semibold text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !newOrgName.trim()}
                                    className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create & Switch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Join Organization */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-[#111318] border border-surface-container-high rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-emerald-400" />
                                Join Existing Organization
                            </h3>
                            <button onClick={() => setShowJoinModal(false)} className="text-secondary hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleJoinOrg} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-white/80 mb-1.5">Organization Invite Code or Slug</label>
                                <input
                                    type="text"
                                    required
                                    value={inviteCodeInput}
                                    onChange={(e) => setInviteCodeInput(e.target.value)}
                                    placeholder="Paste code (e.g. vigil_inv_...)"
                                    className="w-full bg-[#0c0e13] border border-surface-container-high rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowJoinModal(false)}
                                    className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-xs font-semibold text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !inviteCodeInput.trim()}
                                    className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:brightness-110 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Joining...' : 'Join Organization'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Invite Team Code */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-[#111318] border border-surface-container-high rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-surface-container-high/50 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Copy className="w-4 h-4 text-primary" />
                                Team Invite Code
                            </h3>
                            <button onClick={() => setShowInviteModal(false)} className="text-secondary hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs text-secondary/80">
                                Share this invite code with team members so they can join <span className="text-white font-bold">{activeOrg?.name}</span>.
                            </p>

                            <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-surface-container-high flex items-center justify-between">
                                <div className="font-mono text-xs text-emerald-400 select-all truncate pr-2">
                                    {activeOrg?.invite_code || 'vigil_inv_...'}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyInvite}
                                    className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-semibold text-white border border-surface-container-highest flex items-center gap-1.5 flex-shrink-0"
                                >
                                    {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedInvite ? 'Copied' : 'Copy Code'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setShowInviteModal(false)}
                                className="px-5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-xs font-semibold text-white"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
