import { ArrowRight, Check, Code2, Database, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-300">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-[#0b0c10]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-500" />
            <span className="text-xl font-bold text-white">DBArchitect AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm hover:text-blue-400 transition">Features</a>
            <a href="#how" className="text-sm hover:text-blue-400 transition">How It Works</a>
            <a href="#pricing" className="text-sm hover:text-blue-400 transition">Pricing</a>
            <a href="#docs" className="text-sm hover:text-blue-400 transition">Docs</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-sm text-slate-300 hover:text-white transition"
            >
              Log In
            </button>
            <button 
              onClick={() => navigate('/app')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-600/20 mb-8">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">✨ AI-POWERED SQL GENERATION</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight">
              From Prompt to <span className="text-blue-500">Production-</span><br />
              <span className="text-blue-500">Ready Schema</span>
            </h1>
            
            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
              Generate complex tables, indexes, and constraints instantly. Transform natural language into high-performance database architectures with AI-driven precision.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button 
                onClick={() => navigate('/app')}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                Start Designing <span>Free</span> <ArrowRight className="w-4 h-4" />
              </button>
              <button className="px-8 py-3 border border-slate-700 hover:border-slate-600 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2">
                ▶ Watch Demo
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-[#0b0c10]" />
                ))}
              </div>
              <span>Trusted by 2,000+ lead architects</span>
            </div>
          </div>

          {/* Hero Screenshot */}
          <div className="mt-16 relative">
            <div className="aspect-video rounded-xl border border-slate-700 bg-[#12141a] overflow-hidden shadow-2xl">
              <div className="w-full h-full bg-gradient-to-br from-blue-600/10 via-slate-800/50 to-transparent flex items-center justify-center">
                <Database className="w-24 h-24 text-slate-700" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: '2M+', label: 'SCHEMAS BUILT' },
              { number: '99.9%', label: 'SQL ACCURACY' },
              { number: '15+', label: 'DIALECTS SUPPORTED' },
              { number: '40%', label: 'FASTER DEPLOYMENT' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">CORE INTELLIGENCE</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mt-4">Engineered for Architects</h2>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">Everything you need to move from ideation to deployment in seconds. Optimized for high-scale enterprise environments.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Database className="w-8 h-8" />,
                title: 'Multi-table Generation',
                description: 'Generate entire relational schemas from a single prompt with intelligent foreign key mapping and integrity constraints.',
              },
              {
                icon: <Code2 className="w-8 h-8" />,
                title: 'Universal DDL Export',
                description: 'One-click export to PostgreSQL, MySQL, SQL Server, and Oracle. Automated indexing based on extracted query patterns.',
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: 'Automated Relationships',
                description: 'AI automatically detects and builds complex many-to-many and one-to-many relationships from descriptive text.',
              },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/30 hover:bg-slate-900/50 transition">
                <div className="text-blue-500 mb-4">{feature.icon}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-24 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">Design at the speed of thought</h2>
          
          <div className="max-w-3xl mx-auto space-y-8">
            {[
              {
                step: '1',
                title: 'Describe your domain',
                description: 'Build a database for a healthcare SaaS with patients, records, and billing',
              },
              {
                step: '2',
                title: 'AI Generates Schema',
                description: 'Instant visualization of tables, relationships, and data types.',
              },
              {
                step: '3',
                title: 'Export & Deploy',
                description: 'Download the DDL and run it on your production database.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-slate-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-slate-800 bg-gradient-to-r from-blue-600/20 via-transparent to-blue-600/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Ready to architect your next big idea?</h2>
          <p className="text-xl text-slate-400 mb-8">Join 50,000+ developers building robust data layers in minutes instead of days.</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/app')}
              className="px-8 py-3 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition"
            >
              Get Started for Free
            </button>
            <button className="px-8 py-3 border border-slate-700 text-white font-semibold rounded-lg hover:border-slate-600 transition">
              Schedule a Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0b0c10]/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-slate-200">Features</a></li>
                <li><a href="#" className="hover:text-slate-200">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-200">Integrations</a></li>
                <li><a href="#" className="hover:text-slate-200">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-slate-200">Documentation</a></li>
                <li><a href="#" className="hover:text-slate-200">API Reference</a></li>
                <li><a href="#" className="hover:text-slate-200">SQL Optimizer</a></li>
                <li><a href="#" className="hover:text-slate-200">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-slate-200">About us</a></li>
                <li><a href="#" className="hover:text-slate-200">Blog</a></li>
                <li><a href="#" className="hover:text-slate-200">Careers</a></li>
                <li><a href="#" className="hover:text-slate-200">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-slate-200">Privacy</a></li>
                <li><a href="#" className="hover:text-slate-200">Terms</a></li>
                <li><a href="#" className="hover:text-slate-200">Security</a></li>
                <li><a href="#" className="hover:text-slate-200">Compliance</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-400">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Database className="w-5 h-5 text-blue-500" />
              <span>© 2025 DBArchitect AI. All rights reserved.</span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-200">Twitter</a>
              <a href="#" className="hover:text-slate-200">GitHub</a>
              <a href="#" className="hover:text-slate-200">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
