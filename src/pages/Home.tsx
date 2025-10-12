import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Shield, 
  Users, 
  AlertTriangle, 
  BarChart3, 
  Zap,
  Eye,
  Brain,
  Target
} from 'lucide-react';

const Home: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const elements = document.querySelectorAll('.fade-up');
      elements.forEach((element) => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
          element.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Users,
      title: 'Crowd Monitoring',
      description: 'Real-time crowd density analysis and flow tracking with AI-powered insights.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: AlertTriangle,
      title: 'Anomaly Detection',
      description: 'Advanced AI algorithms detect unusual patterns and potential emergencies.',
      color: 'from-red-500 to-orange-500',
    },
    {
      icon: BarChart3,
      title: 'Predictive Analytics',
      description: 'Forecast crowd surges and predict potential incidents before they happen.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Shield,
      title: 'Emergency Response',
      description: 'Automated dispatch system for rapid emergency response coordination.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Eye,
      title: 'Lost & Found',
      description: 'AI-powered facial recognition to help locate missing individuals.',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      icon: Brain,
      title: 'NLP Summaries',
      description: 'Natural language processing for intelligent incident reporting and analysis.',
      color: 'from-teal-500 to-cyan-500',
    },
  ];

  const stats = [
    { label: 'Events Monitored', value: '2,500+', icon: Target },
    { label: 'Lives Saved', value: '150+', icon: Shield },
    { label: 'Response Time', value: '<2min', icon: Zap },
    { label: 'Accuracy Rate', value: '99.7%', icon: Brain },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
          <div className="absolute inset-0 bg-texture opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-transparent to-accent-500/10"></div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-primary-400/30 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
              }}
              animate={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
              }}
              transition={{
                duration: Math.random() * 20 + 10,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="gradient-text">SonicX</span>
              <br />
              <span className="text-white">Emergency Management</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              AI-driven platform for real-time crowd monitoring, anomaly detection, and emergency response coordination.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Link
                to="/dashboard"
                className="group relative px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/25"
              >
                <span className="flex items-center space-x-2">
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </Link>
              
              <Link
                to="/login"
                className="px-8 py-4 glass rounded-xl font-semibold text-white transition-all duration-300 hover:bg-white/10"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1 h-3 bg-white/60 rounded-full mt-2"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-b from-transparent to-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center group"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Comprehensive emergency management tools powered by advanced AI and real-time analytics.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group glass rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 card-hover"
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-500/10 via-transparent to-accent-500/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Ready to Transform Emergency Response?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Join thousands of organizations using SonicX to enhance safety and save lives.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Link
                to="/dashboard"
                className="group relative px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/25"
              >
                <span className="flex items-center space-x-2">
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </Link>
              
              <Link
                to="/login"
                className="px-8 py-4 glass rounded-xl font-semibold text-white transition-all duration-300 hover:bg-white/10"
              >
                Contact Sales
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
