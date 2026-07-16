import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Layers,
  ListFilter,
  MessageSquare,
  Network,
  RefreshCw,
  Server,
  Settings,
  Terminal,
  User,
  Users
} from 'lucide-react';

interface TimelineEvent {
  time: string;
  event: string;
  status: 'error' | 'warning' | 'info' | 'success';
}

interface Incident {
  id: string;
  title: string;
  status: 'active' | 'resolved';
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  source: string;
  alertsCount: number;
  rcaSummary: string;
  confidence: number;
  suspectedRootCause: string;
  impactedServices: string[];
  timeline: TimelineEvent[];
}

const mockIncidents: Incident[] = [
  {
    id: 'inc-9283',
    title: 'Postgres Connection Pool Exhaustion',
    status: 'active',
    severity: 'critical',
    timestamp: '12 mins ago',
    source: 'postgres-db-prod',
    alertsCount: 14,
    confidence: 94,
    rcaSummary: 'Sudden spike in read queries on API servers causing connection pool exhaustion.',
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
    status: 'active',
    severity: 'warning',
    timestamp: '45 mins ago',
    source: 'redis-cache-prod',
    alertsCount: 5,
    confidence: 88,
    rcaSummary: 'Network packet drop during disk write operation on replica instance.',
    suspectedRootCause: 'Network packet drop during disk write operation on replica instance, causing delayed state synchronization.',
    impactedServices: ['redis-cache', 'api-service'],
    timeline: [
      { time: '11:42:00', event: 'RedisReplLag > 5s alert triggered', status: 'warning' },
      { time: '11:44:00', event: 'Vigil Agent evaluated topology path redis -> api-service', status: 'info' }
    ]
  },
  {
    id: 'inc-9150',
    title: 'CPU Usage Spike on Worker Nodes',
    status: 'resolved',
    severity: 'warning',
    timestamp: '2 hours ago',
    source: 'k8s-cluster-1',
    alertsCount: 8,
    confidence: 91,
    rcaSummary: 'Batch processing job ran out of bounds due to missing garbage collection loops.',
    suspectedRootCause: 'Batch processing job ran out of bounds due to missing garbage collection loops. Mitigated by auto-scaling event.',
    impactedServices: ['worker'],
    timeline: [
      { time: '10:15:00', event: 'K8sNodeCPUUsage > 90% alert triggered', status: 'warning' },
      { time: '10:20:00', event: 'K8s node scale-up completed successfully', status: 'success' },
      { time: '10:25:00', event: 'All alerts resolved automatically', status: 'success' }
    ]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'incidents' | 'topology' | 'integrations' | 'settings'>('incidents');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(mockIncidents[0]);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const filteredIncidents = mockIncidents.filter((inc) => {
    if (filterSeverity === 'all') return true;
    return inc.severity === filterSeverity;
  });

  return (
    <div className="flex h-screen bg-background text-on-surface font-sans selection:bg-primary-container selection:text-on-primary-container overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-surface-container-low border-r border-surface-container-high flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Brand Logo */}
          <div className="p-6 flex items-center gap-3 border-b border-surface-container-high">
            <div className="bg-primary text-on-primary w-9 h-9 rounded-lg flex items-center justify-center font-display text-xl font-bold shadow-md">
              V
            </div>
            <div>
              <h1 className="font-headline-md font-bold tracking-tight text-white leading-none">Vigil</h1>
              <span className="text-xs text-secondary font-mono tracking-wider">OBSERVABILITY CO-PILOT</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab('incidents')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'incidents'
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-secondary hover:text-white hover:bg-surface-container-high'
              }`}
            >
              <Activity className="w-4 h-4" />
              Incidents
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'incidents' ? 'bg-on-primary-fixed-variant text-primary' : 'bg-surface-container-high text-secondary'
              }`}>
                {mockIncidents.filter(i => i.status === 'active').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('topology')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'topology'
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-secondary hover:text-white hover:bg-surface-container-high'
              }`}
            >
              <Network className="w-4 h-4" />
              Service Topology
            </button>

            <button
              onClick={() => setActiveTab('integrations')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'integrations'
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-secondary hover:text-white hover:bg-surface-container-high'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Integrations (Slack)
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-secondary hover:text-white hover:bg-surface-container-high'
              }`}
            >
              <Settings className="w-4 h-4" />
              System Settings
            </button>
          </nav>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-surface-container-high bg-surface-container-low/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary border border-surface-container-high">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">SRE Engineer</p>
              <p className="text-xs text-secondary truncate">admin@vigil.local</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-surface-container-lowest">
        {/* Header */}
        <header className="h-16 border-b border-surface-container-high flex items-center justify-between px-8 bg-surface-container-low/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-white tracking-wide capitalize">{activeTab} Monitor</h2>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Agent: Connected
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerRefresh}
              className="p-2 text-secondary hover:text-white hover:bg-surface-container-high rounded-lg transition-all"
              title="Sync metrics"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            </button>
            <div className="h-4 w-px bg-surface-container-high"></div>
            <div className="flex items-center gap-2 text-xs font-mono text-secondary bg-surface-container-high/55 px-3 py-1.5 rounded-md border border-surface-container-high">
              <Server className="w-3.5 h-3.5 text-primary" />
              API PORT: 8080
            </div>
          </div>
        </header>

        {/* Tab Contents */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'incidents' && (
            <>
              {/* Incidents List Panel */}
              <div className="w-1/2 border-r border-surface-container-high flex flex-col min-w-0 overflow-y-auto">
                <div className="p-6 border-b border-surface-container-high flex items-center justify-between bg-surface-container-low/10">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-semibold text-secondary uppercase tracking-wider">Active Outages</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setFilterSeverity('all')}
                      className={`text-xs px-3 py-1.5 rounded-md transition-all border ${
                        filterSeverity === 'all'
                          ? 'bg-surface-container-high text-primary border-outline-variant font-medium'
                          : 'text-secondary border-transparent hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterSeverity('critical')}
                      className={`text-xs px-3 py-1.5 rounded-md transition-all border ${
                        filterSeverity === 'critical'
                          ? 'bg-error-container/30 text-error border-error/20 font-medium'
                          : 'text-secondary border-transparent hover:text-white'
                      }`}
                    >
                      Critical
                    </button>
                    <button
                      onClick={() => setFilterSeverity('warning')}
                      className={`text-xs px-3 py-1.5 rounded-md transition-all border ${
                        filterSeverity === 'warning'
                          ? 'bg-primary-container/20 text-primary border-primary-container/20 font-medium'
                          : 'text-secondary border-transparent hover:text-white'
                      }`}
                    >
                      Warning
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-surface-container-high/40">
                  {filteredIncidents.map((inc) => {
                    const isSelected = selectedIncident?.id === inc.id;
                    return (
                      <div
                        key={inc.id}
                        onClick={() => setSelectedIncident(inc)}
                        className={`p-6 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-surface-container-high/60 border-l-4 border-primary'
                            : 'hover:bg-surface-container-high/20 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="text-xs font-mono text-secondary">{inc.id}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            inc.severity === 'critical'
                              ? 'bg-error-container/30 text-error border border-error/20'
                              : 'bg-primary-container/25 text-primary border border-primary-container/20'
                          }`}>
                            {inc.severity}
                          </span>
                        </div>

                        <h3 className="font-bold text-white mb-2 leading-snug group-hover:text-primary transition-colors text-base">
                          {inc.title}
                        </h3>

                        <p className="text-xs text-secondary line-clamp-2 mb-4 leading-relaxed">
                          {inc.rcaSummary}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-secondary font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-outline" />
                            {inc.timestamp}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-outline" />
                            {inc.alertsCount} alerts grouped
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detail RCA View Panel */}
              <div className="flex-1 flex flex-col overflow-y-auto bg-surface/30 p-8 min-w-0">
                {selectedIncident ? (
                  <div className="space-y-8 animate-fadeIn">
                    {/* Header Details */}
                    <div className="border-b border-surface-container-high pb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-mono text-xs text-secondary bg-surface-container-high px-2.5 py-1 rounded">
                          {selectedIncident.id}
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold font-mono tracking-wider uppercase ${
                          selectedIncident.status === 'active'
                            ? 'bg-error-container/20 text-error border border-error/20 animate-pulse'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {selectedIncident.status}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold font-display text-white mb-3">
                        {selectedIncident.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-secondary">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Server className="w-4 h-4 text-primary" />
                          <span>Source: {selectedIncident.source}</span>
                        </div>
                        <div className="h-4 w-px bg-surface-container-high"></div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <AlertTriangle className="w-4 h-4 text-primary" />
                          <span>Grouped Alerts: {selectedIncident.alertsCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* LLM Root Cause Explanation */}
                    <div className="bg-surface-container-high/40 border border-surface-container-high rounded-xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full filter blur-xl"></div>
                      <div className="flex items-center gap-3 mb-4">
                        <Terminal className="w-5 h-5 text-primary" />
                        <h4 className="font-headline-md font-bold text-white">Causal Reasoning & Explanation</h4>
                        <div className="ml-auto text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                          Confidence: {selectedIncident.confidence}%
                        </div>
                      </div>
                      <p className="text-sm text-on-surface leading-relaxed mb-4">
                        {selectedIncident.suspectedRootCause}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-secondary font-mono">Impacted Services:</span>
                        {selectedIncident.impactedServices.map((svc) => (
                          <span key={svc} className="text-xs font-mono bg-surface-container-high/90 text-white border border-surface-container-high px-2 py-0.5 rounded">
                            {svc}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div>
                      <h4 className="font-headline-md font-bold text-white mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Incident Timeline & Alert Cascade
                      </h4>
                      <div className="relative border-l-2 border-surface-container-high ml-3 pl-6 space-y-6">
                        {selectedIncident.timeline.map((item, idx) => (
                          <div key={idx} className="relative">
                            <span className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center ${
                              item.status === 'error' ? 'border-red-400 bg-red-400/20' :
                              item.status === 'warning' ? 'border-primary bg-primary/20' :
                              item.status === 'success' ? 'border-emerald-400 bg-emerald-400/20' :
                              'border-blue-400 bg-blue-400/20'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            </span>
                            <div className="flex flex-col">
                              <span className="text-xs font-mono text-secondary mb-1">{item.time}</span>
                              <p className="text-sm text-on-surface font-medium">{item.event}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-secondary">
                    <Activity className="w-12 h-12 mb-3 text-surface-container-highest" />
                    <p className="text-sm font-medium">Select an incident to view root cause analysis</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'topology' && (
            <div className="flex-1 p-8 overflow-y-auto space-y-6">
              <div className="border-b border-surface-container-high pb-4">
                <h3 className="text-xl font-bold font-display text-white mb-2">Topology Graph Model</h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Service graph showing real-time dependency propagation. Causal algorithms traverse this map to rank suspected root causes.
                </p>
              </div>

              <div className="bg-surface-container-high/20 border border-surface-container-high/80 rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="flex flex-col md:flex-row items-center justify-center gap-12 max-w-2xl w-full">
                  {/* Database Node */}
                  <div className="flex flex-col items-center p-6 bg-surface-container-high border border-surface-container-highest rounded-xl text-center shadow-lg w-40 relative">
                    <Database className="w-8 h-8 text-primary mb-3" />
                    <span className="text-sm font-bold text-white">Postgres DB</span>
                    <span className="text-[10px] font-mono text-emerald-400 mt-1 uppercase">Healthy</span>
                  </div>

                  <div className="hidden md:block text-secondary font-bold text-lg font-mono">←</div>

                  {/* API Service Node */}
                  <div className="flex flex-col items-center p-6 bg-surface-container-high border-2 border-primary/70 rounded-xl text-center shadow-lg w-44 relative animate-pulse">
                    <div className="absolute -top-2 px-2 py-0.5 bg-primary text-on-primary text-[10px] rounded font-bold font-mono uppercase tracking-wider">
                      Target
                    </div>
                    <Server className="w-8 h-8 text-primary mb-3" />
                    <span className="text-sm font-bold text-white">API Service</span>
                    <span className="text-[10px] font-mono text-primary mt-1 uppercase">Degraded</span>
                  </div>

                  <div className="hidden md:block text-secondary font-bold text-lg font-mono">←</div>

                  {/* Frontend Gateway Node */}
                  <div className="flex flex-col items-center p-6 bg-surface-container-high border border-surface-container-highest rounded-xl text-center shadow-lg w-40 relative">
                    <Server className="w-8 h-8 text-blue-400 mb-3" />
                    <span className="text-sm font-bold text-white">Gateway</span>
                    <span className="text-[10px] font-mono text-emerald-400 mt-1 uppercase">Healthy</span>
                  </div>
                </div>

                <div className="mt-12 text-xs font-mono text-secondary bg-surface-container-high/50 p-4 border border-surface-container-high rounded-lg max-w-md text-center leading-relaxed">
                  Causal Inference Strategy: <strong>Temporal Alert Ordering + Path Reachability Analysis</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="flex-1 p-8 overflow-y-auto space-y-6 max-w-4xl">
              <div className="border-b border-surface-container-high pb-4">
                <h3 className="text-xl font-bold font-display text-white mb-2">On-Call Channels & Notifications</h3>
                <p className="text-sm text-secondary">
                  Configure alert storm notifications, daily reports, and on-call paging integrations.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-surface-container-high/20 border border-surface-container-high p-6 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary w-12 h-12 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Slack Alerts Channel</h4>
                      <p className="text-xs text-secondary font-mono mt-0.5">Connected Channel: #vigil-incidents</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded font-mono">
                      CONNECTED
                    </span>
                    <button className="text-xs font-semibold px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-white border border-surface-container-high rounded-lg transition-all">
                      Test Connection
                    </button>
                  </div>
                </div>

                <div className="bg-surface-container-high/20 border border-surface-container-high p-6 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-secondary-container/30 text-secondary w-12 h-12 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">On-Call Escalations</h4>
                      <p className="text-xs text-secondary mt-0.5">Pages Slack user ID directly on critical events.</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-surface-container-high text-secondary px-3 py-1 rounded">
                    User: U018A2BL4C
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 p-8 overflow-y-auto space-y-6 max-w-4xl">
              <div className="border-b border-surface-container-high pb-4">
                <h3 className="text-xl font-bold font-display text-white mb-2">Configuration Settings</h3>
                <p className="text-sm text-secondary">
                  Manage database strings, chroma databases, and analysis window definitions.
                </p>
              </div>

              <div className="bg-surface-container-high/10 border border-surface-container-high rounded-xl divide-y divide-surface-container-high">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h5 className="text-sm font-bold text-white">Database URL</h5>
                    <p className="text-xs text-secondary mt-0.5">PostgreSQL server location configuration.</p>
                  </div>
                  <div className="font-mono text-xs text-secondary bg-surface-container-high px-4 py-2 rounded-lg border border-surface-container-high">
                    postgresql://docker:***@db:5432/vigil
                  </div>
                </div>

                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h5 className="text-sm font-bold text-white">Vector Storage Location</h5>
                    <p className="text-xs text-secondary mt-0.5">ChromaDB backend vector store connection endpoint.</p>
                  </div>
                  <div className="font-mono text-xs text-secondary bg-surface-container-high px-4 py-2 rounded-lg border border-surface-container-high">
                    http://chroma:8000
                  </div>
                </div>

                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h5 className="text-sm font-bold text-white">Correlation Lookback Window</h5>
                    <p className="text-xs text-secondary mt-0.5">Temporal search window for alert grouping (in minutes).</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-white bg-surface-container-high px-3 py-1.5 rounded-lg border border-surface-container-high">
                      15 minutes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
