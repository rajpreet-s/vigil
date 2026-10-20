import React, { useState } from 'react';
import { Sparkles, Terminal, Sun, Moon } from 'lucide-react';
import { VigilLogo } from '../../../components/ui/VigilLogo';
import { useApp } from '../../../context/AppContext';

export const Login: React.FC = () => {
    const { theme, toggleTheme } = useApp();
    const [isLoading, setIsLoading] = useState(false);
    
    const isExplicitlyDisabled = import.meta.env.VITE_ENABLE_DEV_LOGIN === 'false';
    const isLocalDev =
        !isExplicitlyDisabled &&
        (import.meta.env.DEV ||
            ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(window.location.hostname) ||
            window.location.hostname.endsWith('.local'));

    const handleGoogleLogin = () => {
        setIsLoading(true);
        const apiBase = import.meta.env.VITE_API_BASE_URL || '';
        const currentTheme = theme || localStorage.getItem('theme') || 'dark';
        window.location.href = `${apiBase}/api/auth/google?theme=${currentTheme}`;
    };

    const handleDevLogin = async () => {
        setIsLoading(true);
        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '';
            const res = await fetch(`${apiBase}/api/auth/dev-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (res.ok) {
                const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
                const currentTheme = theme || localStorage.getItem('theme') || 'dark';
                window.location.href = isLocalhost ? `/?theme=${currentTheme}` : `/app?theme=${currentTheme}`;
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Dev login failed. Ensure backend API is running.');
            }
        } catch (err) {
            console.error('Dev login error:', err);
            alert('Failed to reach local API.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen flex bg-bg text-on-surface overflow-hidden font-sans selection:bg-primary-container selection:text-on-primary-container relative">
            {/* Theme Toggle Button (top right corner) */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="p-2.5 rounded-xl bg-surface-container-low/90 hover:bg-surface-container border border-outline/40 text-secondary hover:text-on-surface transition-all shadow-sm flex items-center justify-center backdrop-blur-md"
                    title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                >
                    {theme === 'dark' ? (
                        <Sun className="w-4 h-4 text-primary" />
                    ) : (
                        <Moon className="w-4 h-4 text-primary" />
                    )}
                </button>
            </div>

            {/* Left Column: Flowing Liquid/Mesh Gradient Panel */}
            <style>{`
                @keyframes meshFlow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes floatOrb {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.95); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .flowing-gradient-bg {
                    background: linear-gradient(135deg, #130030 0%, #31106a 40%, #f2a93b 100%);
                    background-size: 200% 200%;
                    animation: meshFlow 12s ease infinite;
                }
            `}</style>

            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden flowing-gradient-bg border-r border-outline/30">
                {/* Overlay mesh grid lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-1" />

                {/* Floating bright glowing orb inside the gradient panel */}
                <div 
                    className="absolute w-[450px] h-[450px] rounded-full bg-gradient-to-r from-primary via-primary-container to-transparent blur-[90px] opacity-40 mix-blend-screen pointer-events-none"
                    style={{
                        top: '20%',
                        left: '10%',
                        animation: 'floatOrb 15s infinite ease-in-out alternate'
                    }}
                />

                {/* Top: Vigil Logo Branding */}
                <div className="z-10 flex items-center gap-2">
                    <VigilLogo height={24} color="#FFFFFF" className="brightness-125" />
                </div>

                {/* Bottom: Modern Headline Description */}
                <div className="z-10 max-w-lg space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono text-white tracking-wide">
                        <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                        <span>AGENTIC OBSERVABILITY ENGINE</span>
                    </div>
                    
                    <h2 className="text-4xl xl:text-5xl font-display font-bold text-white leading-tight tracking-tight">
                        Observability intelligence that acts before outages occur.
                    </h2>
                    
                    <p className="text-white/70 text-base leading-relaxed font-medium max-w-md">
                        Connect your telemetry feeds and let Vigil's agentic reasoning model detect, investigate, and explain incident anomalies in real-time.
                    </p>
                </div>

                {/* Ambient specular sheen */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-2" />
            </div>

            {/* Right Column: Clean Dual-Theme Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(158,142,124,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(158,142,124,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />

                {/* Card Container: Clean, Refined Surface without noisy gradient overlays */}
                <div className="w-full max-w-[420px] bg-surface-container/95 backdrop-blur-xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 z-10 flex flex-col items-center text-center border border-outline/40 shadow-xl transition-all">
                    
                    {/* Mobile Brand Show */}
                    <div className="lg:hidden flex items-center gap-2 mb-8 self-center">
                        <VigilLogo height={24} />
                    </div>

                    {/* Text Headers */}
                    <div className="mb-8 sm:mb-10">
                        <h3 className="text-2xl font-bold tracking-tight text-on-surface mb-2 font-display">
                            Sign In To Your Account
                        </h3>
                        <p className="text-secondary text-sm max-w-xs mx-auto">
                            Let's sign in to your account and get started.
                        </p>
                    </div>

                    {/* Google Auth Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 sm:py-4 rounded-xl border border-outline/40 bg-surface-container-low hover:bg-surface-container-high active:scale-[0.99] text-sm font-semibold text-on-surface transition-all shadow-sm"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <>
                                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                <span>Get Started with Google</span>
                            </>
                        )}
                    </button>
                    
                    {/* Divider & Local One-Click Dev Sign In */}
                    {isLocalDev && (
                        <>
                            <div className="flex items-center gap-3 my-4 w-full">
                                <div className="h-px bg-outline/25 flex-1" />
                                <span className="text-[11px] font-mono text-secondary/60 uppercase tracking-wider">or</span>
                                <div className="h-px bg-outline/25 flex-1" />
                            </div>

                            <button
                                type="button"
                                onClick={handleDevLogin}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 active:scale-[0.99] text-xs font-bold text-primary transition-all shadow-sm group"
                            >
                                <Terminal className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                                <span>Quick Sign In (Local Dev / Demo)</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
