import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  Users,
  MapPin,
  Clock,
  Phone,
  Mail,
  Camera,
  Bell,
  Eye,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Zap
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'fire_detected' | 'smoke_detected' | 'crowd_surge' | 'panic' | 'voice_help' | 'voice_scream' | 'voice_child' | 'voice_distress';
  severity: number;
  confidence: number;
  zone: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  description: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  deviceId?: string;
}

interface Authority {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  department: string;
  status: 'available' | 'busy' | 'offline';
}

const AuthorityDashboard: React.FC = () => {
  const [eventData, setEventData] = useState<any>(null);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cameraStatus, setCameraStatus] = useState<'stopped' | 'starting' | 'running'>('stopped');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [nlpSummary, setNlpSummary] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lfItems, setLfItems] = useState<any[]>([]);
  const [lfReporter, setLfReporter] = useState("");
  const [lfDesc, setLfDesc] = useState("");
  const [lfFile, setLfFile] = useState<File | null>(null);
  const [lfFilter, setLfFilter] = useState<'all'|'reported'|'resolved'>('all');
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);

  useEffect(() => {
    // Load event setup data
    const savedEvent = localStorage.getItem('eventSetup');
    if (savedEvent) {
      const eventSetup = JSON.parse(savedEvent);
      setEventData(eventSetup.event);
      setAuthorities(eventSetup.authorities.map((auth: any) => ({
        ...auth,
        status: 'available' as const
      })));
    }

    // Poll live incidents from backend
    const poll = async () => {
      try {
        const res = await fetch('/incidents');
        const data = await res.json();
        const incs = data?.incidents || [];
        // Map incidents to alert cards
        const mapped: Alert[] = incs.slice(-20).reverse().map((i: any) => ({
          id: String(i.id || i.timestamp || Date.now()),
          type: i.type,
          severity: i.severity ?? 0.5,
          confidence: Math.round((i.severity ?? 0.5) * 100),
          zone: i.zone || 'Unknown',
          timestamp: i.timestamp || new Date().toISOString(),
          status: 'active',
          description: `AI detected ${i.type} in ${i.zone || 'zone'}`,
          location: i.lat && i.lng ? { latitude: i.lat, longitude: i.lng, accuracy: 10 } : undefined,
        }));
        setAlerts(mapped);
      } catch (e) {
        console.warn('Failed to fetch incidents', e);
      }
    };

    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, []);

  // Fetch NLP summary periodically
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/nlp/summary');
        const data = await res.json();
        setNlpSummary(data?.summary || '');
      } catch {}
    };
    fetchSummary();
    const id = setInterval(fetchSummary, 5000);
    return () => clearInterval(id);
  }, []);

  // Lost & Found list poll
  useEffect(() => {
    const loadLf = async () => {
      try { const r = await fetch('/api/lostfound'); const d = await r.json(); setLfItems(d?.items||[]); } catch {}
    };
    loadLf();
    const id = setInterval(loadLf, 5000);
    return () => clearInterval(id);
  }, []);

  const submitLf = async () => {
    if (!lfFile || !lfReporter) return;
    const form = new FormData();
    form.append('reporter', lfReporter);
    form.append('description', lfDesc);
    form.append('image', lfFile);
    try {
      const res = await fetch('/api/lostfound/report', { method: 'POST', body: form });
      if (res.ok) {
        setLfReporter(""); setLfDesc(""); setLfFile(null);
        const r = await fetch('/api/lostfound'); const d = await r.json(); setLfItems(d?.items||[]);
      }
    } catch {}
  };

  // Local webcam preview controls
  const startLocalCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setCamStream(s);
    } catch (e) {
      console.warn('Camera access failed', e);
    }
  };

  const stopLocalCamera = () => {
    camStream?.getTracks().forEach(t => t.stop());
    setCamStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const liveScan = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob: Blob = await new Promise(res=> canvas.toBlob(b=> res(b as Blob), 'image/jpeg', 0.7));
    const form = new FormData();
    form.append('image', blob, 'frame.jpg');
    try {
      const r = await fetch('/api/lostfound/match', { method: 'POST', body: form });
      const d = await r.json();
      const top = d?.matches?.[0];
      if (top && top.score > 0.85) {
        // Add incident so both dashboards see it
        await fetch('/api/incidents/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zone: 'LiveScan', type: 'lost_found_match', severity: Math.min(top.score, 0.99), status: 'active', description: `Possible match: ${top.description || ''}`
          })
        });
      }
    } catch {}
  };

  const handleLogout = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } finally {
      window.location.href = '/login';
    }
  };

  const askAI = async () => {
    if (!aiQuestion.trim()) return;
    setIsAskingAi(true);
    try {
      // Capture current camera frame for AI analysis
      let cameraFrame = null;
      if (videoRef.current && camStream) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth || 640;
          canvas.height = videoRef.current.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            cameraFrame = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
          }
        } catch (e) {
          console.log('Camera frame capture failed:', e);
        }
      }

      const res = await fetch('/api/nlp/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: aiQuestion,
          camera_frame: cameraFrame ? 'available' : 'unavailable'
        })
      });
      const data = await res.json();
      setAiAnswer(data?.answer || 'No answer received');
    } catch (e) {
      setAiAnswer('Unable to get AI response');
    } finally {
      setIsAskingAi(false);
    }
  };

  // Simulate real-time alerts
  useEffect(() => {
    if (!isMonitoring) return;

    const alertInterval = setInterval(() => {
      const alertTypes = ['fire_detected', 'smoke_detected', 'crowd_surge', 'panic'];
      const zones = ['Main Hall', 'Entrance', 'Parking Lot', 'Restaurant Area'];
      
      // Randomly generate alerts (low probability)
      if (Math.random() > 0.95) {
        const newAlert: Alert = {
          id: Date.now().toString(),
          type: alertTypes[Math.floor(Math.random() * alertTypes.length)] as any,
          severity: Math.random(),
          confidence: 70 + Math.random() * 25,
          zone: zones[Math.floor(Math.random() * zones.length)],
          timestamp: new Date().toISOString(),
          status: 'active',
          description: `AI detected ${alertTypes[Math.floor(Math.random() * alertTypes.length)]} in ${zones[Math.floor(Math.random() * zones.length)]}`
        };
        
        setAlerts(prev => [newAlert, ...prev.slice(0, 9)]); // Keep only latest 10
        
        // Send SMS/Email to authorities for critical alerts
        if (newAlert.severity > 0.7) {
          notifyAuthorities(newAlert);
        }
      }
    }, 3000);

    return () => clearInterval(alertInterval);
  }, [isMonitoring]);

  const notifyAuthorities = async (alert: Alert) => {
    // In a real app, this would send SMS/Email
    console.log(`🚨 CRITICAL ALERT: ${alert.type} in ${alert.zone}`);
    
    // Update authority status to busy
    setAuthorities(prev => prev.map(auth => ({
      ...auth,
      status: 'busy' as const
    })));
  };

  const startMonitoring = async () => {
    setCameraStatus('starting');
    setIsMonitoring(true);
    
    try {
      // Start camera monitoring
      const response = await fetch('/camera/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone: 'A', source: 'webcam' })
      });
      
      if (response.ok) {
        setCameraStatus('running');
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      setCameraStatus('stopped');
    }
  };

  const stopMonitoring = async () => {
    setIsMonitoring(false);
    setCameraStatus('stopped');
    
    try {
      await fetch('/camera/stop/A', { method: 'POST' });
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert
    ));
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, status: 'resolved' } : alert
    ));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'fire_detected': return '🔥';
      case 'smoke_detected': return '💨';
      case 'crowd_surge': return '👥';
      case 'panic': return '🚨';
      case 'voice_help': return '🆘';
      case 'voice_scream': return '😱';
      case 'voice_child': return '👶';
      case 'voice_distress': return '😰';
      default: return '⚠️';
    }
  };

  const getAlertColor = (severity: number) => {
    if (severity > 0.8) return 'text-red-400 bg-red-400/10 border-red-400/20';
    if (severity > 0.6) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-400 bg-red-400/20';
      case 'acknowledged': return 'text-yellow-400 bg-yellow-400/20';
      case 'resolved': return 'text-green-400 bg-green-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  if (!eventData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Event Setup Found</h2>
          <p className="text-gray-400 mb-6">Please setup an event first.</p>
          <Link
            to="/event-setup"
            className="px-6 py-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Setup Event
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
                <Shield className="w-8 h-8 text-red-400" />
                <span>Authority Dashboard</span>
              </h1>
              <p className="text-gray-300">{eventData.eventName} - {eventData.location}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}></div>
                <span className="text-sm">
                  {isMonitoring ? 'Monitoring Active' : 'Monitoring Stopped'}
                </span>
              </div>
              
              <button
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isMonitoring 
                    ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                    : 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30'
                }`}
              >
                {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20"
              >
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{alerts.filter(a => a.status === 'active').length}</div>
                <div className="text-sm text-gray-400">Active Alerts</div>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{authorities.filter(a => a.status === 'available').length}</div>
                <div className="text-sm text-gray-400">Available Staff</div>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{eventData.expectedAttendees}</div>
                <div className="text-sm text-gray-400">Expected Guests</div>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">&lt;30s</div>
                <div className="text-sm text-gray-400">Avg Response</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Live Webcam Tile */}
          <div className="glass rounded-xl p-4">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Camera className="w-5 h-5 text-blue-400" />
              <span>Live Preview</span>
            </h2>
            <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-lg border border-white/10 bg-black" style={{ aspectRatio: '16/9' }} />
            <div className="flex items-center gap-2 mt-3">
              <button onClick={startLocalCamera} className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-sm">Start</button>
              <button onClick={stopLocalCamera} className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">Stop</button>
              <button onClick={liveScan} className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 text-sm">Live Scan</button>
            </div>
            {nlpSummary && (
              <div className="mt-4 text-sm text-gray-300">
                <span className="text-gray-400">AI Summary:</span> {nlpSummary}
              </div>
            )}
          </div>

          {/* AI Question Interface */}
          <div className="glass rounded-xl p-4">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <span>🤖</span>
              <span>AI Assistant</span>
            </h2>
            <div className="space-y-3">
              <input
                value={aiQuestion}
                onChange={e => setAiQuestion(e.target.value)}
                placeholder="Ask about incidents, crowd status, fire safety, etc..."
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-400"
                onKeyPress={e => e.key === 'Enter' && askAI()}
              />
              <div className="flex gap-2">
                <button
                  onClick={askAI}
                  disabled={isAskingAi || !aiQuestion.trim()}
                  className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 text-sm hover:bg-purple-500/30 disabled:opacity-50"
                >
                  {isAskingAi ? 'Asking AI...' : 'Ask AI'}
                </button>
                <button
                  onClick={async () => {
                    if (!videoRef.current || !camStream) return;
                    try {
                      const canvas = document.createElement('canvas');
                      canvas.width = videoRef.current.videoWidth || 640;
                      canvas.height = videoRef.current.videoHeight || 360;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
                        const form = new FormData();
                        form.append('image', blob as Blob);
                        const res = await fetch('/api/camera/analyze', { method: 'POST', body: form });
                        const data = await res.json();
                        if (data.status === 'ok') {
                          const analysis = data.analysis;
                          setAiAnswer(`📹 Live Camera Analysis:\n• Fire Detected: ${analysis.fire_detected ? '🚨 YES' : '✅ No'}\n• Smoke Detected: ${analysis.smoke_detected ? '🚨 YES' : '✅ No'}\n• Crowd Density: ${analysis.crowd_density}\n• People Count: ${analysis.people_count}\n• Activity Level: ${analysis.activity_level}\n• Safety Score: ${analysis.safety_score}/10`);
                        }
                      }
                    } catch (e) {
                      setAiAnswer('Camera analysis failed');
                    }
                  }}
                  disabled={!camStream}
                  className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 text-sm hover:bg-blue-500/30 disabled:opacity-50"
                >
                  📹 Analyze Live
                </button>
              </div>
              {aiAnswer && (
                <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded text-sm text-gray-300">
                  <div className="text-gray-400 mb-1">AI Response:</div>
                  <div>{aiAnswer}</div>
                </div>
              )}
            </div>
          </div>

          {/* Active Alerts */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <Bell className="w-5 h-5 text-red-400" />
              <span>Active Alerts</span>
            </h2>
            
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="glass rounded-lg p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-300">No active alerts. All systems normal.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass rounded-lg p-6 border ${getAlertColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                        <div>
                          <h3 className="font-semibold text-white capitalize">
                            {alert.type.replace('_', ' ')}
                          </h3>
                          <p className="text-sm text-gray-300">{alert.zone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">
                          {Math.round(alert.confidence)}%
                        </div>
                        <div className="text-xs text-gray-400">confidence</div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-300 mb-4">{alert.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {alert.status === 'active' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 text-sm hover:bg-yellow-500/30 transition-colors"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-sm hover:bg-green-500/30 transition-colors"
                          >
                            Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Authorities */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <Users className="w-5 h-5 text-green-400" />
              <span>Emergency Team</span>
            </h2>
            
            <div className="space-y-4">
              {authorities.map((authority) => (
                <div key={authority.id} className="glass rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{authority.name}</h3>
                      <p className="text-sm text-gray-300">{authority.role}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      authority.status === 'available' ? 'bg-green-400' :
                      authority.status === 'busy' ? 'bg-yellow-400' : 'bg-red-400'
                    }`}></div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>{authority.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{authority.email}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lost & Found Quick Report + List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="glass rounded-xl p-4">
            <h2 className="text-xl font-semibold text-white mb-4">Lost & Found Report</h2>
            <div className="space-y-3">
              <input value={lfReporter} onChange={e=>setLfReporter(e.target.value)} placeholder="Reporter name" className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-400" />
              <input value={lfDesc} onChange={e=>setLfDesc(e.target.value)} placeholder="Description" className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-400" />
              <input type="file" accept="image/*" onChange={e=>setLfFile(e.target.files?.[0]||null)} className="text-sm text-gray-300" />
              <button onClick={submitLf} className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 text-sm hover:bg-blue-500/30">Submit Report</button>
            </div>
          </div>
          <div className="lg:col-span-2 glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Reports</h2>
              <select value={lfFilter} onChange={e=>setLfFilter(e.target.value as any)} className="px-3 py-2 bg-white/5 border border-white/20 rounded text-white">
                <option value="all">All</option>
                <option value="reported">Reported</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="space-y-3">
              {lfItems.filter(i=> lfFilter==='all' || (i.status||'reported')===lfFilter).map(i=> (
                <div key={i.id} className="bg-white/5 border border-white/10 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-white text-sm">{i.description || 'No description'}</div>
                    <div className="text-xs text-gray-400">{i.reporter}</div>
                  </div>
                  <div className="text-xs text-gray-500">{new Date(i.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-black border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Settings</h3>
              <button onClick={()=>setSettingsOpen(false)} className="text-gray-400 hover:text-gray-200">Close</button>
            </div>
            <div className="space-y-4 text-sm text-gray-300">
              <div className="flex items-center justify-between">
                <span>Auto-start monitoring on load</span>
                <input type="checkbox" className="accent-blue-500" />
              </div>
              <div className="flex items-center justify-between">
                <span>Play sound on critical alert</span>
                <input type="checkbox" className="accent-blue-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorityDashboard;
