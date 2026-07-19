import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import VigilLogo from '../../../components/ui/VigilLogo';

export const Login: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = () => {
        setIsLoading(true);
        window.location.href = '/api/auth/google';
    };

    return (
        <div className="min-h-screen w-screen flex bg-[#0c0e13] text-on-surface overflow-hidden font-sans selection:bg-primary-container selection:text-on-primary-container">
            {/* Injecting keyframe animations for the flowing mesh gradient & border glow */}
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
                @keyframes borderFlow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .flowing-gradient-bg {
                    background: linear-gradient(135deg, #130030 0%, #31106a 40%, #f2a93b 100%);
                    background-size: 200% 200%;
                    animation: meshFlow 12s ease infinite;
                }
                .metallic-border-active {
                    background: linear-gradient(90deg, #52525b, #a1a1aa, #f2a93b, #52525b);
                    background-size: 300% 300%;
                    animation: borderFlow 4s linear infinite;
                }
            `}</style>

            {/* Left Column: Flowing Liquid/Mesh Gradient Panel */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden flowing-gradient-bg border-r border-surface-container-high/20">
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

            {/* Right Column: Premium Dark Mode Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
                {/* Background Specular reflections for the form pane */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(158,142,124,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(158,142,124,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-1" />
                <div className="absolute w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />

                {/* Card Container with flowing metallic border on hover */}
                <div className="relative group w-full max-w-[420px] p-[1px] rounded-2xl bg-gradient-to-br from-surface-container-high via-surface-container-highest to-surface-container-high transition-all duration-300 z-10 hover:shadow-[0_0_40px_-15px_rgba(242,169,59,0.2)]">
                    
                    {/* Active metallic gradient border effect on group hover */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none metallic-border-active z-0" />

                    {/* Inside Card Body */}
                    <div className="relative bg-[#111318]/95 backdrop-blur-xl rounded-2xl px-8 py-10 z-10 flex flex-col items-center text-center">
                        
                        {/* Mobile Brand Show (logo header only visible on mobile screen) */}
                        <div className="lg:hidden flex items-center gap-2 mb-8 self-center">
                            <VigilLogo height={24} color="#FFFFFF" />
                        </div>

                        {/* Text Headers */}
                        <div className="mb-10">
                            <h3 className="text-2xl font-bold tracking-tight text-white mb-2">
                                Sign In To Your Account.
                            </h3>
                            <p className="text-secondary text-sm max-w-xs mx-auto">
                                Let's sign in to your account and get started.
                            </p>
                        </div>

                        {/* Google Auth Button */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border border-outline/40 bg-surface-container-low/50 hover:bg-surface-container-high/60 active:scale-[0.99] text-sm font-semibold text-white transition-all shadow-md"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    <span>Get Started with Google</span>
                                </>
                            )}
                        </button>
                        
                    </div>
                </div>
            </div>
        </div>
    );
};
