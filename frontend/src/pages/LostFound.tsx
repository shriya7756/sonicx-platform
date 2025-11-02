import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Upload,
  Eye,
  MapPin,
  Clock,
  User,
  Camera,
  CheckCircle,
  AlertCircle,
  Filter,
  Download,
  Share
} from 'lucide-react';

const LostFound: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [reporterName, setReporterName] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [capStream, setCapStream] = useState<MediaStream | null>(null);

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // AI analysis of uploaded image
  const analyzeImage = async () => {
    if (!uploadedImage) return;
    
    setIsAnalyzing(true);
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock analysis result
      const mockResult = {
        personDetected: Math.random() > 0.3,
        confidence: Math.floor(Math.random() * 30) + 70,
        features: {
          age: Math.floor(Math.random() * 40) + 20,
          gender: Math.random() > 0.5 ? 'Male' : 'Female',
          clothing: ['Blue shirt', 'Dark pants', 'White shoes'],
          accessories: ['Watch', 'Backpack']
        },
        matches: Math.floor(Math.random() * 5),
        recommendations: [
          'Check CCTV footage from Main Entrance',
          'Contact Security Team Alpha',
          'Broadcast description to all staff'
        ]
      };
      
      setAnalysisResult(mockResult);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load existing lost&found items and support filters
  const fetchItems = async () => {
    try {
      const res = await fetch('/api/lostfound');
      const data = await res.json();
      setItems(data?.items || []);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => { fetchItems(); }, []);

  const filteredItems = items.filter(item => {
    const matchesText = searchQuery.trim() === '' ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.reporter || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedCategory === 'all') return matchesText;
    return matchesText && (item.status || 'reported') === selectedCategory;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setUploadedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const startCapture = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    setCapStream(s);
    if (videoRef.current) videoRef.current.srcObject = s;
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setUploadedImage(canvas.toDataURL('image/jpeg'));
  };

  const stopCapture = () => {
    capStream?.getTracks().forEach(t => t.stop());
    setCapStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const submitReport = async () => {
    if (!uploadedImage || !reporterName) return;
    setIsAnalyzing(true);
    try {
      // Convert dataURL to Blob
      const blob = await (await fetch(uploadedImage)).blob();
      const form = new FormData();
      form.append('reporter', reporterName);
      form.append('description', searchQuery);
      form.append('image', blob, 'capture.jpg');
      const res = await fetch('/api/lostfound/report', { method: 'POST', body: form });
      if (res.ok) {
        await fetchItems();
        setIsUploadModalOpen(false);
        setUploadedImage(null);
        setReporterName('');
      }
    } catch (e) { console.warn(e); }
    finally { setIsAnalyzing(false); stopCapture(); }
  };

  const missingPersons = [
    {
      id: 1,
      name: 'Sarah Johnson',
      age: 28,
      lastSeen: 'Central Plaza',
      timeMissing: '2 hours ago',
      description: 'Wearing blue jacket, brown hair, 5\'6"',
      status: 'searching',
      image: '/api/placeholder/150/150',
      contact: '+1-555-0123',
      reporter: 'Security Guard Mike'
    },
    {
      id: 2,
      name: 'Michael Chen',
      age: 45,
      lastSeen: 'North Gate',
      timeMissing: '4 hours ago',
      description: 'Business suit, black hair, 6\'0"',
      status: 'found',
      image: '/api/placeholder/150/150',
      contact: '+1-555-0124',
      reporter: 'Event Staff Lisa'
    },
    {
      id: 3,
      name: 'Emma Wilson',
      age: 12,
      lastSeen: 'East Wing',
      timeMissing: '1 hour ago',
      description: 'Pink dress, blonde hair, 4\'8"',
      status: 'searching',
      image: '/api/placeholder/150/150',
      contact: '+1-555-0125',
      reporter: 'Parent John Wilson'
    },
    {
      id: 4,
      name: 'David Rodriguez',
      age: 35,
      lastSeen: 'Main Square',
      timeMissing: '6 hours ago',
      description: 'Red shirt, dark hair, 5\'10"',
      status: 'investigating',
      image: '/api/placeholder/150/150',
      contact: '+1-555-0126',
      reporter: 'Friend Maria'
    }
  ];

  const foundItems = [
    {
      id: 1,
      item: 'Black Backpack',
      location: 'Central Plaza',
      foundTime: '30 min ago',
      description: 'Black backpack with laptop compartment',
      status: 'unclaimed',
      image: '/api/placeholder/150/150',
      finder: 'Security Guard Tom'
    },
    {
      id: 2,
      item: 'iPhone 14',
      location: 'North Gate',
      foundTime: '1 hour ago',
      description: 'Silver iPhone 14 with cracked screen',
      status: 'claimed',
      image: '/api/placeholder/150/150',
      finder: 'Event Staff Anna'
    },
    {
      id: 3,
      item: 'Child\'s Toy',
      location: 'East Wing',
      foundTime: '2 hours ago',
      description: 'Blue stuffed bear',
      status: 'unclaimed',
      image: '/api/placeholder/150/150',
      finder: 'Cleaner Maria'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'searching': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'found': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'investigating': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'unclaimed': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'claimed': return 'text-green-400 bg-green-400/10 border-green-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'searching': return AlertCircle;
      case 'found': return CheckCircle;
      case 'investigating': return Eye;
      case 'unclaimed': return AlertCircle;
      case 'claimed': return CheckCircle;
      default: return AlertCircle;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-transparent to-blue-500/10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <span>Lost & Found</span>
              </h1>
              <p className="text-gray-300">
                AI-powered facial recognition and item tracking system
              </p>
            </div>
            <div className="mt-4 lg:mt-0 flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-lg">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-indigo-400">AI Active</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Active Cases</div>
                <div className="text-2xl font-bold text-white">7</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for missing persons or items..."
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="missing">Missing Persons</option>
              <option value="found">Found Items</option>
            </select>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25"
            >
              <Upload className="w-4 h-4" />
              <span>Report Missing</span>
            </button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-400" />
              </div>
              <AlertCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">3</div>
            <div className="text-sm text-gray-400">Missing Persons</div>
            <div className="text-xs text-blue-400 mt-1">Active searches</div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <Eye className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">1</div>
            <div className="text-sm text-gray-400">Found Today</div>
            <div className="text-xs text-green-400 mt-1">Successfully reunited</div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Search className="w-6 h-6 text-orange-400" />
              </div>
              <Camera className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">2</div>
            <div className="text-sm text-gray-400">Unclaimed Items</div>
            <div className="text-xs text-orange-400 mt-1">Awaiting pickup</div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-400" />
              </div>
              <Filter className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">94%</div>
            <div className="text-sm text-gray-400">Recognition Accuracy</div>
            <div className="text-xs text-green-400 mt-1">+2% improvement</div>
          </div>
        </motion.div>

        {/* Missing Persons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-400" />
            <span>Missing Persons</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {missingPersons.map((person, index) => {
              const StatusIcon = getStatusIcon(person.status);
              return (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  className={`glass rounded-xl p-6 border ${getStatusColor(person.status)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{person.name}</h3>
                        <p className="text-sm text-gray-300">Age: {person.age}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wide">{person.status}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Last seen: {person.lastSeen}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Missing: {person.timeMissing}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Reported by: {person.reporter}</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 mb-4">{person.description}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center space-x-3">
                      <button className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors duration-200">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm hover:bg-green-500/30 transition-colors duration-200">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <button className="px-3 py-2 bg-gray-500/20 border border-gray-500/30 rounded-lg text-gray-400 text-sm hover:bg-gray-500/30 transition-colors duration-200">
                      <Share className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Found Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
            <Search className="w-5 h-5 text-orange-400" />
            <span>Found Items</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {foundItems.map((item, index) => {
              const StatusIcon = getStatusIcon(item.status);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  className={`glass rounded-xl p-6 border ${getStatusColor(item.status)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{item.item}</h3>
                        <p className="text-sm text-gray-300">Found by: {item.finder}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wide">{item.status}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Location: {item.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Found: {item.foundTime}</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 mb-4">{item.description}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center space-x-3">
                      <button className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors duration-200">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm hover:bg-green-500/30 transition-colors duration-200">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <button className="px-3 py-2 bg-gray-500/20 border border-gray-500/30 rounded-lg text-gray-400 text-sm hover:bg-gray-500/30 transition-colors duration-200">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-white mb-6">Report Missing Person</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Age</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter age"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Last Seen Location</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Where were they last seen?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Physical description, clothing, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Photo</label>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Click to upload photo</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 bg-gray-500/20 border border-gray-500/30 rounded-lg text-gray-400 hover:bg-gray-500/30 transition-colors duration-200"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25">
                Submit Report
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default LostFound;
