import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  MapPin,
  AlertTriangle,
  Shield,
  Phone,
  Wifi,
  Battery,
  Volume2,
  VolumeX,
  Users,
  Bell,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

interface VoiceAlert {
  id: string;
  type: 'help' | 'scream' | 'child' | 'distress';
  confidence: number;
  timestamp: string;
  location: LocationData;
  audioLevel: number;
}

const MobileParticipant: React.FC = () => {
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
    location: false
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [voiceAlerts, setVoiceAlerts] = useState<VoiceAlert[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  // Lost & Found state (participant)
  const [lfReporter, setLfReporter] = useState<string>("Participant");
  const [lfDesc, setLfDesc] = useState<string>("");
  const [lfFile, setLfFile] = useState<File | null>(null);
  const [lfItems, setLfItems] = useState<any[]>([]);
  const [lfFilter, setLfFilter] = useState<'all'|'reported'|'resolved'>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [nlpSummary, setNlpSummary] = useState("");

  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    requestPermissions();
    startLocationTracking();
  }, []);

  // Poll Lost & Found list
  useEffect(() => {
    const loadLf = async () => {
      try {
        const r = await fetch('/api/lostfound');
        const d = await r.json();
        setLfItems(d?.items || []);
      } catch {}
    };
    loadLf();
    const id = setInterval(loadLf, 5000);
    return () => clearInterval(id);
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
    const id = setInterval(fetchSummary, 10000);
    return () => clearInterval(id);
  }, []);

  const requestPermissions = async () => {
    try {
      // Request camera permission
      const cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      setPermissions(prev => ({ ...prev, camera: true }));
      cameraStream.getTracks().forEach(track => track.stop());

      // Request microphone permission
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        video: false,
        audio: true 
      });
      setPermissions(prev => ({ ...prev, microphone: true }));
      micStream.getTracks().forEach(track => track.stop());

      // Request location permission
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setPermissions(prev => ({ ...prev, location: true })),
          () => console.log('Location permission denied')
        );
      }

    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        });
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  };

  const startVoiceMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Start audio level monitoring
      monitorAudioLevel();

      // Start voice detection
      detectVoice();

      // Notify backend that participant joined
      try {
        await fetch('/api/participant/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: 'mobile-participant-' + Date.now(),
            location
          })
        });
      } catch {}

      setIsMonitoring(true);
    } catch (error) {
      console.error('Failed to start voice monitoring:', error);
    }
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      analyserRef.current!.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average);
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  };

  const detectVoice = () => {
    let lastSent = 0;
    const detectionInterval = setInterval(() => {
      if (!analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      // Detect high audio levels (potential screaming/help calls)
      if (average > 110 && Date.now() - lastSent > 2500) {
        const alertType = detectVoiceType(average);
        
        const newAlert: VoiceAlert = {
          id: Date.now().toString(),
          type: alertType,
          confidence: Math.min(average / 2, 95),
          timestamp: new Date().toISOString(),
          location: location || { latitude: 0, longitude: 0, accuracy: 0, timestamp: '' },
          audioLevel: average
        };

        setVoiceAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
        
        // Send alert to authorities
        sendVoiceAlert(newAlert);
        lastSent = Date.now();
      }
    }, 1000);

    return () => clearInterval(detectionInterval);
  };

  const detectVoiceType = (audioLevel: number): 'help' | 'scream' | 'child' | 'distress' => {
    // Simple voice type detection based on audio characteristics
    if (audioLevel > 150) return 'scream';
    if (audioLevel > 120) return 'help';
    if (audioLevel > 90) return 'distress';
    return 'child';
  };

  const sendVoiceAlert = async (alert: VoiceAlert) => {
    try {
      await fetch('/api/voice-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...alert,
          deviceId: 'mobile-participant-' + Date.now(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform
          }
        })
      });
    } catch (error) {
      console.error('Failed to send voice alert:', error);
    }
  };

  const stopVoiceMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsMonitoring(false);
  };

  const triggerEmergency = () => {
    setIsEmergencyMode(true);
    const emergencyAlert: VoiceAlert = {
      id: 'emergency-' + Date.now(),
      type: 'help',
      confidence: 100,
      timestamp: new Date().toISOString(),
      location: location || { latitude: 0, longitude: 0, accuracy: 0, timestamp: '' },
      audioLevel: 255
    };
    
    setVoiceAlerts(prev => [emergencyAlert, ...prev]);
    sendVoiceAlert(emergencyAlert);
    
    setTimeout(() => setIsEmergencyMode(false), 5000);
  };

  const connectToEvent = () => {
    setIsConnected(true);
    startVoiceMonitoring();
  };

  const disconnectFromEvent = () => {
    setIsConnected(false);
    stopVoiceMonitoring();
    setVoiceAlerts([]);
  };

  const submitLostFound = async () => {
    if (!lfFile) return;
    const form = new FormData();
    form.append('reporter', lfReporter || 'Participant');
    form.append('description', lfDesc);
    form.append('image', lfFile);
    try {
      const res = await fetch('/api/lostfound/report', { method: 'POST', body: form });
      if (res.ok) {
        setLfDesc("");
        setLfFile(null);
        const r = await fetch('/api/lostfound');
        const d = await r.json();
        setLfItems(d?.items || []);
      }
    } catch {}
  };

  const askAI = async () => {
    if (!aiQuestion.trim()) return;
    setIsAskingAi(true);
    try {
      // Capture current camera frame for AI analysis
      let cameraFrame = null;
      if (streamRef.current) {
        try {
          const video = document.createElement('video');
          video.srcObject = streamRef.current;
          await video.play();
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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

  const liveScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      // @ts-ignore
      const ImageCaptureClass = (window as any).ImageCapture;
      const imageCapture = ImageCaptureClass ? new ImageCaptureClass(track) : null;
      let blob: Blob | null = null;
      if (imageCapture && imageCapture.takePhoto) {
        blob = await imageCapture.takePhoto();
      } else {
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        blob = await new Promise(res=> canvas.toBlob(b=> res(b as Blob), 'image/jpeg', 0.7));
      }
      stream.getTracks().forEach(t=>t.stop());
      if (!blob) return;
      const form = new FormData();
      form.append('image', blob, 'frame.jpg');
      const r = await fetch('/api/lostfound/match', { method: 'POST', body: form });
      const d = await r.json();
      const top = d?.matches?.[0];
      if (top && top.score > 0.85) {
        await fetch('/api/incidents/add', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zone: 'Participant', type: 'lost_found_match', severity: Math.min(top.score, 0.99), status: 'active', description: `Possible match: ${top.description || ''}` })
        });
      }
    } catch {}
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <Shield className="w-6 h-6 text-blue-400" />
              <span>Event Participant</span>
            </h1>
            <p className="text-sm text-gray-400">Mobile Safety Monitor</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Permissions Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-4"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Device Permissions</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Camera className="w-5 h-5 text-blue-400" />
                <span className="text-white">Camera Access</span>
              </div>
              {permissions.camera ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mic className="w-5 h-5 text-green-400" />
                <span className="text-white">Microphone Access</span>
              </div>
              {permissions.microphone ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-purple-400" />
                <span className="text-white">Location Access</span>
              </div>
              {permissions.location ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
          </div>
        </motion.div>

        {/* Location Info */}
        {location && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-purple-400" />
              <span>Your Location</span>
            </h2>
            <div className="text-sm text-gray-300 space-y-1">
              <div>Lat: {location.latitude.toFixed(6)}</div>
              <div>Lng: {location.longitude.toFixed(6)}</div>
              <div>Accuracy: ±{Math.round(location.accuracy)}m</div>
            </div>
          </motion.div>
        )}

        {/* Connection Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-4"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Event Connection</h2>
          
          {!isConnected ? (
            <button
              onClick={connectToEvent}
              disabled={!permissions.camera || !permissions.microphone}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl text-white font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wifi className="w-5 h-5" />
              Connect to Event Safety Network
            </button>
          ) : (
            <div className="space-y-4">
              <button
                onClick={disconnectFromEvent}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl text-white font-semibold hover:from-red-600 hover:to-orange-600 transition-all duration-300"
              >
                <Wifi className="w-5 h-5" />
                Disconnect from Event
              </button>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Voice Monitoring:</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <span className="text-sm text-gray-300">
                    {isMonitoring ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              {isMonitoring && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Audio Level:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-red-400 transition-all duration-100"
                        style={{ width: `${(audioLevel / 255) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-300">{Math.round(audioLevel)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Emergency Button */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-4"
          >
            <button
              onClick={triggerEmergency}
              disabled={isEmergencyMode}
              className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-white font-bold transition-all duration-300 ${
                isEmergencyMode 
                  ? 'bg-red-600 animate-pulse' 
                  : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
              {isEmergencyMode ? 'EMERGENCY SENT!' : 'EMERGENCY ALERT'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              Press if you need immediate help
            </p>
          </motion.div>
        )}

        {/* Voice Alerts */}
        {voiceAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-xl p-4"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Bell className="w-5 h-5 text-yellow-400" />
              <span>Voice Alerts Detected</span>
            </h2>
            
            <div className="space-y-3">
              {voiceAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-white capitalize">
                        {alert.type} detected
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {Math.round(alert.confidence)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(alert.timestamp).toLocaleTimeString()} • 
                    Audio: {alert.audioLevel}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Lost & Found (Participant) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-4"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Lost & Found</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-3">
              <input
                value={lfReporter}
                onChange={e=>setLfReporter(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-400"
              />
              <input
                value={lfDesc}
                onChange={e=>setLfDesc(e.target.value)}
                placeholder="Description (e.g., Blue backpack)"
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white placeholder-gray-400"
              />
              <input
                type="file"
                accept="image/*"
                onChange={e=>setLfFile(e.target.files?.[0]||null)}
                className="text-sm text-gray-300"
              />
              <button
                onClick={submitLostFound}
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 text-sm hover:bg-blue-500/30"
              >
                Submit Report
              </button>
              <button
                onClick={liveScan}
                className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 text-sm hover:bg-purple-500/30"
              >
                Live Scan
              </button>
            </div>
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Reports</span>
                <select value={lfFilter} onChange={e=>setLfFilter(e.target.value as any)} className="px-3 py-2 bg-white/5 border border-white/20 rounded text-white text-sm">
                  <option value="all">All</option>
                  <option value="reported">Reported</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="space-y-2">
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
        </motion.div>

        {/* AI Assistant */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-4"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <span>🤖</span>
            <span>AI Assistant</span>
          </h2>
          <div className="space-y-3">
            <input
              value={aiQuestion}
              onChange={e => setAiQuestion(e.target.value)}
              placeholder="Ask about safety, incidents, lost & found..."
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
                  if (!streamRef.current) return;
                  try {
                    const video = document.createElement('video');
                    video.srcObject = streamRef.current;
                    await video.play();
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 360;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
                disabled={!streamRef.current}
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
            {nlpSummary && (
              <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded text-sm text-gray-300">
                <div className="text-gray-400 mb-1">Live Summary:</div>
                <div>{nlpSummary}</div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      {/* Footer actions */}
      <div className="p-4">
        <div className="flex items-center justify-end gap-3">
          <button onClick={()=>setSettingsOpen(true)} className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20">Settings</button>
          <button onClick={()=>{ localStorage.clear(); sessionStorage.clear(); window.location.href='/login'; }} className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20">Logout</button>
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
                <span>Share voice alerts</span>
                <input type="checkbox" defaultChecked className="accent-blue-500" />
              </div>
              <div className="flex items-center justify-between">
                <span>Share location</span>
                <input type="checkbox" defaultChecked className="accent-blue-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileParticipant;
