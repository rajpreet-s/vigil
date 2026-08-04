import React, { createContext, useContext, useState } from 'react';
import type { Incident, ConnectionState } from '../types/incident';
import { parseRcaSummary } from '../features/incidents/utils/formatIncident';

interface ToastState {
  message: string;
  type: 'success' | 'warning' | 'error';
}

export interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  org_id?: string | null;
  org_role?: string | null;
}

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  joined_at?: string;
  api_key?: string;
  invite_code?: string;
  member_count?: number;
  is_active?: boolean;
}

interface AppContextType {
  incidents: Incident[];
  selectedIncidentId: string;
  selectedIncident: Incident | null;
  filterSeverity: 'all' | 'critical' | 'warning';
  isRefreshing: boolean;
  connectionState: ConnectionState;
  isSimulating: boolean;
  simStep: number;
  settleProgress: number;
  simAlertsCount: number;
  activeNode: string | null;
  showDismissModal: boolean;
  showAccessibleDAG: boolean;
  draftRcaReport: string;
  kbQuery: string;
  kbResults: { doc: string; score: number; file: string }[];
  isSearchingKb: boolean;
  toast: ToastState | null;
  user: UserInfo | null;
  userOrgs: OrgInfo[];
  activeOrg: OrgInfo | null;
  setUser: (user: UserInfo | null) => void;
  
  // Organization Actions
  refreshOrgs: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<boolean>;
  createOrg: (name: string, slug?: string) => Promise<boolean>;
  joinOrg: (inviteCode: string) => Promise<boolean>;
  
  // Actions
  setFilterSeverity: (val: 'all' | 'critical' | 'warning') => void;
  setSelectedIncidentId: (id: string) => void;
  setConnectionState: (state: ConnectionState) => void;
  setShowDismissModal: (show: boolean) => void;
  setShowAccessibleDAG: (show: boolean) => void;
  setDraftRcaReport: (report: string) => void;
  setKbQuery: (query: string) => void;
  setActiveNode: (node: string | null) => void;
  
  triggerRefresh: () => void;
  handleReconnect: () => void;
  triggerSimulatedOutage: () => void;
  showToast: (message: string, type: 'success' | 'warning' | 'error') => void;
  handleApproveSlack: () => void;
  handleConfirmDismiss: () => void;
  handleKbSearch: (e: React.FormEvent) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
  
  // Real-time Simulation state variables
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState<number>(0); // 0: Idle, 1: Settle Count, 2: Run Nodes, 3: Completed
  const [settleProgress, setSettleProgress] = useState(0);
  const [simAlertsCount, setSimAlertsCount] = useState(0);
  const [activeNode, setActiveNode] = useState<string | null>('human_review');
  
  // Custom dialogs & dropdowns
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [showAccessibleDAG, setShowAccessibleDAG] = useState(false);
  const [draftRcaReport, setDraftRcaReport] = useState<string>('');
  
  // KB search
  const [kbQuery, setKbQuery] = useState('');
  const [kbResults, setKbResults] = useState<{ doc: string; score: number; file: string }[]>([]);
  const [isSearchingKb, setIsSearchingKb] = useState(false);

  // Toast banner
  const [toast, setToast] = useState<ToastState | null>(null);

  // User & Organization details
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userOrgs, setUserOrgs] = useState<OrgInfo[]>([]);
  const [activeOrg, setActiveOrg] = useState<OrgInfo | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const refreshOrgs = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.authenticated) {
          setUser(meData.user);
        }
      }

      const orgsRes = await fetch('/api/orgs');
      if (orgsRes.ok) {
        const data = await orgsRes.json();
        if (data.success) {
          setUserOrgs(data.organizations || []);
          const active = (data.organizations || []).find((o: OrgInfo) => o.is_active) || data.organizations?.[0] || null;
          setActiveOrg(active);
        }
      }
    } catch (err) {
      console.error('Failed to fetch orgs:', err);
    }
  };

  React.useEffect(() => {
    refreshOrgs();
  }, []);

  // Reset selected incident and active draft state whenever active organization changes
  React.useEffect(() => {
    if (activeOrg?.id) {
      setSelectedIncidentId('');
      setSelectedIncident(null);
      setDraftRcaReport('');
      setKbQuery('');
      setKbResults([]);
    }
  }, [activeOrg?.id]);

  const switchOrg = async (orgId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/orgs/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Switched active organization to ${data.active_org.name}`, 'success');
        await refreshOrgs();
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 800);
        return true;
      } else {
        showToast(data.error || 'Failed to switch organization', 'error');
        return false;
      }
    } catch (err) {
      showToast('Network error while switching organization', 'error');
      return false;
    }
  };

  const createOrg = async (name: string, slug?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Created organization "${data.organization.name}"!`, 'success');
        await refreshOrgs();
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 800);
        return true;
      } else {
        showToast(data.error || 'Failed to create organization', 'error');
        return false;
      }
    } catch (err) {
      showToast('Network error while creating organization', 'error');
      return false;
    }
  };

  const joinOrg = async (inviteCode: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/orgs/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Joined organization "${data.organization.name}"!`, 'success');
        await refreshOrgs();
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 800);
        return true;
      } else {
        showToast(data.error || 'Invalid invite code', 'error');
        return false;
      }
    } catch (err) {
      showToast('Network error while joining organization', 'error');
      return false;
    }
  };

  // Fetch real incident details whenever selectedIncidentId changes
  React.useEffect(() => {
    if (!selectedIncidentId) {
      setSelectedIncident(null);
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/incidents/${selectedIncidentId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          const formatted: Incident = {
            id: data.id,
            title: data.title,
            status: data.status === 'approved' ? 'resolved' : data.status === 'open' || data.status === 'pending_review' ? 'reviewing' : data.status,
            severity: data.severity || 'critical',
            timestamp: new Date(data.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: data.source || data.services_affected[0] || 'Unknown Service',
            alertsCount: data.alertsCount || 0,
            confidence: data.confidence || 90,
            suspectedRootCause: data.rca_summary || `Affected services: ${(data.services_affected || []).join(', ')}`,
            impactedServices: data.services_affected || [],
            timeline: data.timeline || [],
            anomalies: data.anomalies || [],
            causal_chain: data.causal_chain || [],
            blast_radius: data.blast_radius || [],
            ruled_out: data.ruled_out || [],
            fix_steps: data.fix_steps || [],
            root_cause_metric: data.root_cause_metric || null,
          };
          setSelectedIncident(formatted);
          if (data.rca_summary) {
            const formatted = parseRcaSummary(data.rca_summary, data.services_affected || [], data.id, data.fix_steps || []);
            setDraftRcaReport(formatted.formattedSlackMrkdwn);
          }
        }
      } catch (err) {
        console.error('Failed to fetch incident details:', err);
      }
    };
    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedIncidentId]);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleReconnect = () => {
    setConnectionState('reconnecting');
    setTimeout(() => {
      setConnectionState('connected');
      showToast('Successfully reconnected to Agent Server.', 'success');
    }, 1500);
  };

  const runSimulatedAgentGraph = (currentAlertsCount: number) => {
    setSimStep(2);
    const nodes = ['load', 'correlate', 'investigate', 'retrieval', 'rca', 'human_review'];
    let nodeIndex = 0;
    
    const nodeInterval = setInterval(() => {
      if (nodeIndex >= nodes.length) {
        clearInterval(nodeInterval);
        
        setSimStep(3);
        setIsSimulating(false);
        setActiveNode('human_review');
        showToast('Simulated alert storm processing sequence complete.', 'warning');
        return;
      }
      
      setActiveNode(nodes[nodeIndex]);
      nodeIndex++;
    }, 900);
  };

  const triggerSimulatedOutage = () => {
    setIsSimulating(true);
    setSimStep(1);
    setSettleProgress(100);
    let count = 1;
    setSimAlertsCount(count);
    setActiveNode(null);
    
    const settleInterval = setInterval(() => {
      setSettleProgress((prev) => {
        if (prev <= 10) {
          clearInterval(settleInterval);
          runSimulatedAgentGraph(count);
          return 0;
        }
        return prev - 10;
      });
      count += Math.floor(Math.random() * 3) + 1;
      setSimAlertsCount(count);
    }, 400);
  };

  const handleApproveSlack = async () => {
    if (!selectedIncidentId) return;
    try {
      const approvedMessage = draftRcaReport.includes(':white_check_mark: *Approved*')
        ? draftRcaReport
        : `${draftRcaReport}\n\n:white_check_mark: *Approved* · ${new Date().toUTCString()} · \`${selectedIncidentId}\``;

      // 1. Dispatch real Slack broadcast if Slack plugin is configured
      try {
        await fetch('/api/onboarding/test-slack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rca_summary: approvedMessage }),
        });
      } catch (slackErr) {
        console.warn('Slack API broadcast attempted', slackErr);
      }

      // 2. Persist state to PostgreSQL database
      const res = await fetch(`/api/incidents/${selectedIncidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED', rca_summary: approvedMessage }),
      });
      if (res.ok) {
        setSelectedIncident((prev) => (prev ? { ...prev, status: 'resolved' } : null));
        setDraftRcaReport(approvedMessage);
        showToast(`⚡ Incident ${selectedIncidentId} approved! RCA report broadcasted to Slack.`, 'success');
      }
    } catch (err) {
      console.error('Failed to approve incident:', err);
    }
  };

  const handleConfirmDismiss = async () => {
    if (!selectedIncidentId) return;
    try {
      const res = await fetch(`/api/incidents/${selectedIncidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISMISSED' }),
      });
      if (res.ok) {
        setSelectedIncident((prev) => (prev ? { ...prev, status: 'dismissed' } : null));
        setShowDismissModal(false);
        showToast(`Incident ${selectedIncidentId} was dismissed. Checkpointed state discarded.`, 'error');
      }
    } catch (err) {
      console.error('Failed to dismiss incident:', err);
    }
  };

  const handleKbSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbQuery) return;
    setIsSearchingKb(true);
    setTimeout(() => {
      const allDocs = [
        { doc: 'Postgres Connection pool exhaustion guidelines: increase replica pool sizing and scale max_connections parameter inside target database settings.', score: 0.94, file: 'runbook_postgres_limits.md' },
        { doc: 'Redis cluster replication lag mitigation protocol: check replica disk buffer sizing constraints and packet drop logs.', score: 0.82, file: 'runbook_redis_replication.md' },
        { doc: 'Worker container out-of-memory heap recycling limits: trigger GC execution hooks or initiate pod restart sequence.', score: 0.54, file: 'runbook_k8s_worker_heap.md' }
      ];
      const matches = allDocs.filter(d => d.doc.toLowerCase().includes(kbQuery.toLowerCase()) || kbQuery.length > 2);
      setKbResults(matches);
      setIsSearchingKb(false);
    }, 500);
  };

  return (
    <AppContext.Provider
      value={{
        incidents,
        selectedIncidentId,
        selectedIncident,
        filterSeverity,
        isRefreshing,
        connectionState,
        isSimulating,
        simStep,
        settleProgress,
        simAlertsCount,
        activeNode,
        showDismissModal,
        showAccessibleDAG,
        draftRcaReport,
        kbQuery,
        kbResults,
        isSearchingKb,
        toast,
        user,
        userOrgs,
        activeOrg,
        setUser,
        
        refreshOrgs,
        switchOrg,
        createOrg,
        joinOrg,
        
        setFilterSeverity,
        setSelectedIncidentId,
        setConnectionState,
        setShowDismissModal,
        setShowAccessibleDAG,
        setDraftRcaReport,
        setKbQuery,
        setActiveNode,
        
        triggerRefresh,
        handleReconnect,
        triggerSimulatedOutage,
        showToast,
        handleApproveSlack,
        handleConfirmDismiss,
        handleKbSearch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
};
