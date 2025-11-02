import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  Truck,
  BarChart3,
  Search,
  MessageSquare,
  Bell,
  TrendingUp,
  Clock,
  MapPin,
  Activity,
  Shield,
  Eye,
  Zap
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'warning', message: 'High crowd density detected at Main Square', time: '2 min ago', severity: 'medium' },
    { id: 2, type: 'info', message: 'Emergency response team dispatched to Zone A', time: '5 min ago', severity: 'low' },
    { id: 3, type: 'alert', message: 'Anomaly detected: Unusual movement pattern', time: '8 min ago', severity: 'high' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      title: 'Crowd Monitoring',
      description: 'Real-time crowd analysis',
      icon: Users,
      href: '/crowd-monitoring',
      status: 'active',
      metrics: { value: '2,847', label: 'People Tracked' },
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Anomaly Detection',
      description: 'AI-powered threat detection',
      icon: AlertTriangle,
      href: '/anomaly-detection',
      status: 'active',
      metrics: { value: '3', label: 'Active Alerts' },
      color: 'from-red-500 to-orange-500',
    },
    {
      title: 'Help Dispatch',
      description: 'Emergency response coordination',
      icon: Truck,
      href: '/help-dispatch',
      status: 'active',
      metrics: { value: '12', label: 'Teams Deployed' },
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Predictive Analytics',
      description: 'Crowd surge forecasting',
      icon: BarChart3,
      href: '/predictive-analytics',
      status: 'active',
      metrics: { value: '85%', label: 'Accuracy Rate' },
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Lost & Found',
      description: 'AI facial recognition',
      icon: Search,
      href: '/lost-found',
      status: 'active',
      metrics: { value: '7', label: 'Missing Reports' },
      color: 'from-indigo-500 to-blue-500',
    },
    {
      title: 'NLP Summaries',
      description: 'Intelligent reporting',
      icon: MessageSquare,
      href: '/nlp-summaries',
      status: 'active',
      metrics: { value: '24', label: 'Reports Generated' },
      color: 'from-teal-500 to-cyan-500',
    },
  ];

  const recentActivity = [
    { id: 1, action: 'Crowd density threshold exceeded', location: 'Main Square', time: '2 min ago', type: 'crowd' },
    { id: 2, action: 'Emergency team dispatched', location: 'Zone A', time: '5 min ago', type: 'dispatch' },
    { id: 3, action: 'Anomaly pattern detected', location: 'North Gate', time: '8 min ago', type: 'anomaly' },
    { id: 4, action: 'Missing person report filed', location: 'East Wing', time: '12 min ago', type: 'missing' },
    { id: 5, action: 'Crowd surge predicted', location: 'Central Plaza', time: '15 min ago', type: 'prediction' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'low': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'crowd': return Users;
      case 'dispatch': return Truck;
      case 'anomaly': return AlertTriangle;
      case 'missing': return Search;
      case 'prediction': return BarChart3;
      default: return Activity;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500/10 via-transparent to-accent-500/10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Emergency Command Center
              </h1>
              <p className="text-gray-300">
                Real-time monitoring and response coordination
              </p>
            </div>
            <div className="mt-4 lg:mt-0 flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Current Time</div>
                <div className="text-lg font-mono text-white">
                  {currentTime.toLocaleTimeString()}
                </div>
              </div>
              <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">System Online</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Bell className="w-5 h-5 text-yellow-400" />
              <span>Active Alerts</span>
            </h2>
            <Link
              to="/notifications"
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors duration-200"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`glass rounded-lg p-4 border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{alert.time}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    alert.severity === 'high' ? 'bg-red-400' :
                    alert.severity === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'
                  }`}></div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-white mb-6">System Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  whileHover={{ scale: 1.02 }}
                  className="group"
                >
                  <Link to={feature.href}>
                    <div className="glass rounded-xl p-6 hover:bg-white/10 transition-all duration-300 cursor-pointer">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-400 uppercase tracking-wide">Active</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-gray-300 mb-4">{feature.description}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-white">{feature.metrics.value}</div>
                          <div className="text-xs text-gray-400">{feature.metrics.label}</div>
                        </div>
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          <div>
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-primary-400" />
              <span>Recent Activity</span>
            </h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                    className="flex items-start space-x-3 p-4 glass rounded-lg hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{activity.action}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">{activity.location}</span>
                        <Clock className="w-3 h-3 text-gray-400 ml-2" />
                        <span className="text-xs text-gray-400">{activity.time}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-accent-400" />
              <span>Quick Stats</span>
            </h2>
            <div className="space-y-4">
              <div className="glass rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Total Crowd</div>
                      <div className="text-2xl font-bold text-white">2,847</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-green-400">+12%</div>
                    <div className="text-xs text-gray-400">vs last hour</div>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-400 h-2 rounded-full" style={{ width: '68%' }}></div>
                </div>
              </div>

              <div className="glass rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Active Alerts</div>
                      <div className="text-2xl font-bold text-white">3</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-red-400">+1</div>
                    <div className="text-xs text-gray-400">new this hour</div>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-red-400 h-2 rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>

              <div className="glass rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Response Time</div>
                      <div className="text-2xl font-bold text-white">1.8min</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-green-400">-0.3min</div>
                    <div className="text-xs text-gray-400">avg improvement</div>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
