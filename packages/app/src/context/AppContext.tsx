import React, { createContext, useContext, useState } from 'react';
import type { Incident, ConnectionState } from '../types/incident';

interface ToastState {
  message: string;
  type: 'success' | 'warning' | 'error';
}

export interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
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
  setUser: (user: UserInfo | null) => void;
  
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

const initialIncidents: Incident[] = [
  {
    id: 'inc-9283',
    title: 'Postgres Connection Pool Exhaustion',
    status: 'reviewing',
    severity: 'critical',
    timestamp: '12 mins ago',
    source: 'postgres-db-prod',
    alertsCount: 14,
    confidence: 94,
    suspectedRootCause: 'Sudden spike in read queries on API servers causing connection pooling backlog. Aggregated 14 raw Prometheus alerts.',
    impactedServices: ['api-service', 'worker', 'postgres'],
    timeline: [
      { time: '12:15:30', event: 'PostgresPoolUsagePercent > 95% alert triggered', status: 'error' },
      { time: '12:15:45', event: 'WorkerDBConnectionFailure alert triggered', status: 'warning' },
      { time: '12:16:12', event: 'API Response Time latency exceeded 2000ms', status: 'warning' },
      { time: '12:17:00', event: 'Vigil Agent grouped 14 alert storms into this incident context', status: 'info' }
    ]
  },
  {
    id: 'inc-9279',
    title: 'Redis Replication Lag Spike',
    status: 'reviewing',
    severity: 'warning',
    timestamp: '45 mins ago',
    source: 'redis-cache-prod',
    alertsCount: 5,
    confidence: 65,
    suspectedRootCause: 'Network packet drop during disk write operation on replica instance, causing delayed state synchronization.',
    impactedServices: ['redis-cache', 'api-service'],
    timeline: [
      { time: '11:42:00', event: 'RedisReplLag > 5s alert triggered', status: 'warning' },
      { time: '11:44:00', event: 'Vigil Agent evaluated topology path redis -> api-service', status: 'info' }
    ]
  }
];

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('inc-9283');
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
  const [draftRcaReport, setDraftRcaReport] = useState<string>(
    `## RCA: Pool exhaustion on PostgreSQL\n\n- **Suspected cause**: Spike in batch worker query concurrency.\n- **Impacted systems**: api-service, worker\n- **Action proposed**: Restart replica pool and isolate query thread #1042.`
  );
  
  // KB search
  const [kbQuery, setKbQuery] = useState('');
  const [kbResults, setKbResults] = useState<{ doc: string; score: number; file: string }[]>([]);
  const [isSearchingKb, setIsSearchingKb] = useState(false);

  // Toast banner
  const [toast, setToast] = useState<ToastState | null>(null);

  // User Profile details
  const [user, setUser] = useState<UserInfo | null>(null);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || null;

  const showToast = (message: string, type: 'success' | 'warning' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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
        
        const newSimulatedIncident: Incident = {
          id: 'inc-9290',
          title: 'Unchecked Pool Expansion: Gateway Outage',
          status: 'reviewing',
          severity: 'critical',
          timestamp: 'Just now',
          source: 'gateway-api-prod',
          alertsCount: currentAlertsCount,
          confidence: 91,
          suspectedRootCause: 'Simulated alert storm: Prometheus gateway response latency breached SLA due to pool expansion failure.',
          impactedServices: ['gateway', 'api-service'],
          timeline: [
            { time: 'Just Now', event: 'GatewayResponseLatencyExceeded > 5000ms', status: 'error' },
            { time: 'Just Now', event: 'DatabasePoolSizingWarning', status: 'warning' },
            { time: 'Just Now', event: 'Vigil Agent grouped and executed analysis sequence', status: 'info' }
          ]
        };

        setIncidents(prev => {
          const filtered = prev.filter(inc => inc.id !== 'inc-9290');
          return [newSimulatedIncident, ...filtered];
        });
        setSelectedIncidentId('inc-9290');
        setDraftRcaReport(
          `## RCA: Gateway Pool Expansion Failure\n\n- **Suspected cause**: Gateway pool bounds locked under load.\n- **Impacted systems**: gateway, api-service\n- **Action proposed**: Expand DB connection sizing guidelines and recycle gateway pods.`
        );
        setSimStep(3);
        setIsSimulating(false);
        setActiveNode('human_review');
        showToast('New simulated outage paused on human review node.', 'warning');
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

  const handleApproveSlack = () => {
    if (!selectedIncident) return;
    setIncidents(prev =>
      prev.map(inc => (inc.id === selectedIncident.id ? { ...inc, status: 'resolved' } : inc))
    );
    showToast(`Slack notification broadcasted for ${selectedIncident.id}. Status set to Resolved.`, 'success');
  };

  const handleConfirmDismiss = () => {
    if (!selectedIncident) return;
    setIncidents(prev =>
      prev.map(inc => (inc.id === selectedIncident.id ? { ...inc, status: 'dismissed' } : inc))
    );
    setShowDismissModal(false);
    showToast(`Incident ${selectedIncident.id} was dismissed. Checkpointed state discarded.`, 'error');
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
        setUser,
        
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
