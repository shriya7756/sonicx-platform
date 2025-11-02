import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CrowdMonitoring from './pages/CrowdMonitoring';
import AnomalyDetection from './pages/AnomalyDetection';
import HelpDispatch from './pages/HelpDispatch';
import PredictiveAnalytics from './pages/PredictiveAnalytics';
import LostFound from './pages/LostFound';
import NLPSummaries from './pages/NLPSummaries';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/crowd-monitoring" element={<Layout><CrowdMonitoring /></Layout>} />
        <Route path="/anomaly-detection" element={<Layout><AnomalyDetection /></Layout>} />
        <Route path="/help-dispatch" element={<Layout><HelpDispatch /></Layout>} />
        <Route path="/predictive-analytics" element={<Layout><PredictiveAnalytics /></Layout>} />
        <Route path="/lost-found" element={<Layout><LostFound /></Layout>} />
        <Route path="/nlp-summaries" element={<Layout><NLPSummaries /></Layout>} />
        <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;
