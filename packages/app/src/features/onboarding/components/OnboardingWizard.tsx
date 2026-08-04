import React, { useState, useEffect } from 'react';
import { StepWorkspace } from './StepWorkspace';
import { StepSlack } from './StepSlack';
import { StepPrometheus } from './StepPrometheus';
import { StepKnowledge } from './StepKnowledge';
import { StepComplete } from './StepComplete';
import { Check, ShieldCheck, Activity, Cpu, Server, Network, RotateCcw } from 'lucide-react';
import VigilLogo from '../../../components/ui/VigilLogo';

import { useApp } from '../../../context/AppContext';

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { activeOrg } = useApp();

  // Restore active step and wizard data from localStorage on page refresh
  const [currentStep, setCurrentStep] = useState<number>(() => {
    try {
      const savedStep = localStorage.getItem('vigil_onboarding_step');
      if (savedStep) {
        const parsed = parseInt(savedStep, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return 1;
  });

  const [wizardData, setWizardData] = useState<any>(() => {
    try {
      const savedData = localStorage.getItem('vigil_onboarding_data');
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch {
      // Fallback
    }
    return {};
  });

  const [status, setStatus] = useState<any>(null);

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vigil_onboarding_step', currentStep.toString());
    } catch (e) {
      console.error('Failed to persist onboarding step', e);
    }
  }, [currentStep]);

  useEffect(() => {
    try {
      localStorage.setItem('vigil_onboarding_data', JSON.stringify(wizardData));
    } catch (e) {
      console.error('Failed to persist onboarding data', e);
    }
  }, [wizardData]);

  useEffect(() => {
    fetch('/api/onboarding/status')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => {});
  }, [currentStep, activeOrg?.id]);

  const handleNextStep = (stepData: any) => {
    setWizardData((prev: any) => ({ ...prev, ...stepData }));
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleResetWizard = () => {
    localStorage.removeItem('vigil_onboarding_step');
    localStorage.removeItem('vigil_onboarding_data');
    setWizardData({});
    setCurrentStep(1);
  };

  const handleFinishOnboarding = () => {
    localStorage.setItem('vigil_onboarding_completed', 'true');
    if (onComplete) {
      onComplete();
    }
  };

  const isCompleted = localStorage.getItem('vigil_onboarding_completed') === 'true' || currentStep === 5;

  const steps = [
    { num: 1, label: 'Workspace & Gemini Engine', desc: 'Environment & LLM reasoning provider' },
    { num: 2, label: 'Slack Bot Credentials', desc: 'Alert broadcasting & approval webhooks' },
    { num: 3, label: 'Prometheus & Alertmanager', desc: 'Telemetry & debouncing webhook target' },
    { num: 4, label: 'Topology & Runbooks', desc: 'Causal service graph & vector index' },
    { num: 5, label: 'Readiness Verification', desc: 'Audit checklist & simulated outage launch' },
  ];

  return (
    <div className="w-full min-h-full p-4 sm:p-6 lg:p-8 bg-background text-on-surface lantern-bg">
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high/60 pb-4">
          <div className="flex items-center gap-4">
            <VigilLogo height={26} color="#FFFFFF" />
            <div className="h-5 w-px bg-surface-container-high/60 hidden sm:block" />
            <div>
              <h1 className="text-base font-bold text-white font-display tracking-tight leading-snug">
                Setup & Telemetry Onboarding
              </h1>
              <p className="text-xs text-secondary/80 flex items-center gap-2">
                <span>Self-Hosted SRE Copilot</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  API Active
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleResetWizard}
              className="text-xs px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary/80 hover:text-white transition-all border border-surface-container-highest flex items-center gap-1.5"
              title="Reset onboarding progress"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Wizard</span>
            </button>

            <button
              type="button"
              onClick={handleFinishOnboarding}
              className="text-xs px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary hover:text-white transition-all border border-surface-container-highest font-semibold"
            >
              {isCompleted ? 'Exit to Dashboard →' : 'Skip Setup & Go to Dashboard →'}
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column (4 cols): Stepper & System Health Metrics */}
          <div className="lg:col-span-4 space-y-6">
            {/* Step Navigation Sidebar */}
            <div className="bg-[#111318]/90 backdrop-blur-xl border border-surface-container-high/60 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center justify-between border-b border-surface-container-high/40 pb-2">
                <span>Setup Workflow</span>
                <span className="font-mono text-primary text-[11px]">Step {currentStep} of 5</span>
              </div>

              <div className="space-y-1">
                {steps.map((s) => {
                  const isActive = currentStep === s.num;
                  const isDone = currentStep > s.num;
                  return (
                    <div
                      key={s.num}
                      onClick={() => {
                        if (isDone || isActive) setCurrentStep(s.num);
                      }}
                      className={`p-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-primary/10 border border-primary/40 shadow-sm'
                          : isDone
                          ? 'hover:bg-surface-container-high/40 border border-transparent'
                          : 'opacity-50 border border-transparent'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 mt-0.5 transition-all ${
                          isDone
                            ? 'bg-emerald-400 text-black'
                            : isActive
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-secondary/60'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                      </div>

                      <div className="overflow-hidden">
                        <div
                          className={`text-xs font-bold transition-colors ${
                            isActive ? 'text-primary' : isDone ? 'text-emerald-400' : 'text-white/80'
                          }`}
                        >
                          {s.label}
                        </div>
                        <div className="text-[11px] text-secondary/70 truncate">{s.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live System Diagnostics Box */}
            <div className="bg-[#111318]/90 backdrop-blur-xl border border-surface-container-high/60 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-surface-container-high/40 pb-2">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  Live Cluster Telemetry
                </span>
                <span className="text-[10px] font-mono text-emerald-400">Online</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-secondary/80">
                    <Server className="w-3.5 h-3.5 text-secondary" />
                    Database Edge
                  </span>
                  <span className="font-mono text-emerald-400">PostgreSQL</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-secondary/80">
                    <Cpu className="w-3.5 h-3.5 text-secondary" />
                    Reasoning Engine
                  </span>
                  <span className="font-mono text-primary">Google Gemini API</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-secondary/80">
                    <Network className="w-3.5 h-3.5 text-secondary" />
                    Causal Edges
                  </span>
                  <span className="font-mono text-white">{status?.integrations?.topology?.edgeCount || 0} configured</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-secondary/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                    Vector Runbooks
                  </span>
                  <span className="font-mono text-white">{status?.integrations?.runbooks?.documentCount || 0} indexed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (8 cols): Interactive Active Step Card */}
          <div className="lg:col-span-8">
            <div className="bg-[#111318]/90 backdrop-blur-2xl border border-surface-container-high/60 rounded-2xl p-5 sm:p-7 shadow-2xl">
              {currentStep === 1 && <StepWorkspace onNext={handleNextStep} />}
              {currentStep === 2 && <StepSlack onNext={handleNextStep} onBack={handlePrevStep} />}
              {currentStep === 3 && <StepPrometheus onNext={handleNextStep} onBack={handlePrevStep} />}
              {currentStep === 4 && <StepKnowledge onNext={handleNextStep} onBack={handlePrevStep} />}
              {currentStep === 5 && (
                <StepComplete summaryData={wizardData} onFinish={handleFinishOnboarding} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
