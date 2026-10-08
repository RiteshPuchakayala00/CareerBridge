import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowRight, Menu, CheckCircle2, MapPin } from 'lucide-react';
import { cn } from './lib/utils';

// --- UI PREVIEW COMPONENTS ---
const StudentProfileUI = () => (
  <div className="w-full h-full bg-white rounded-md shadow-lg overflow-hidden flex flex-col p-6 border border-[--color-stone-900]/5 transition-transform duration-300 hover:scale-[1.01] hover:shadow-xl">
    <div className="flex gap-4 items-center mb-6 border-b border-[--color-stone-900]/5 pb-6">
      <div className="w-16 h-16 rounded-full bg-[--color-stone-100] border-2 border-white shadow-inner flex items-center justify-center text-[--color-stone-900]/20 font-serif text-2xl">JD</div>
      <div>
        <div className="text-xl font-medium font-serif text-[--color-stone-900]">Jane Doe</div>
        <div className="text-xs text-[--color-stone-800]/60 uppercase tracking-wider mt-1">Computer Science, 2024</div>
      </div>
    </div>
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center bg-[--color-stone-50] p-3 rounded text-sm text-[--color-stone-900]">
        <span className="text-[--color-stone-800]/60">CGPA</span>
        <span className="font-medium">3.92</span>
      </div>
      <div className="flex justify-between items-center bg-[--color-stone-50] p-3 rounded text-sm text-[--color-stone-900]">
        <span className="text-[--color-stone-800]/60">Skills</span>
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-white text-[10px] rounded border border-[--color-stone-900]/5">React</span>
          <span className="px-2 py-1 bg-white text-[10px] rounded border border-[--color-stone-900]/5">Python</span>
        </div>
      </div>
    </div>
  </div>
);

const ApplicationsUI = () => (
  <div className="w-full h-full bg-white rounded-md shadow-lg overflow-hidden p-6 border border-[--color-stone-900]/5 transition-transform duration-300 hover:scale-[1.01] hover:shadow-xl">
    <h3 className="text-xs uppercase tracking-widest font-bold text-[--color-stone-900]/40 mb-6">Active Applications</h3>
    <div className="flex flex-col gap-4">
      <div className="p-4 border border-[--color-stone-900]/5 hover:border-[--color-terracotta]/30 transition-colors bg-white flex justify-between items-center group rounded-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[--color-stone-900] text-white flex items-center justify-center font-bold text-lg rounded-sm">T</div>
          <div>
            <div className="font-medium text-sm text-[--color-stone-900]">TechNova Inc.</div>
            <div className="text-xs text-[--color-stone-800]/60">Frontend Engineer</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-[--color-terracotta] uppercase tracking-wider">Interview</div>
        </div>
      </div>
      <div className="p-4 border border-[--color-stone-900]/5 bg-white flex justify-between items-center opacity-70 rounded-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-900 text-white flex items-center justify-center font-bold text-lg rounded-sm">G</div>
          <div>
            <div className="font-medium text-sm text-[--color-stone-900]">Global Systems</div>
            <div className="text-xs text-[--color-stone-800]/60">Data Analyst</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Under Review</div>
        </div>
      </div>
    </div>
  </div>
);

const InterviewsUI = () => (
  <div className="w-full h-full bg-white rounded-md shadow-lg overflow-hidden p-6 border border-[--color-stone-900]/5 transition-transform duration-300 hover:scale-[1.01] hover:shadow-xl">
    <div className="bg-white p-5 rounded-sm border border-[--color-stone-900]/10 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-[--color-terracotta]"></div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-xs text-[--color-stone-900]/50 uppercase tracking-wider mb-1">Upcoming Interview</div>
          <div className="font-serif text-lg text-[--color-stone-900]">Technical Round 1</div>
          <div className="text-sm font-medium text-[--color-stone-900] mt-1">TechNova Inc.</div>
        </div>
        <div className="w-8 h-8 rounded bg-[--color-terracotta]/10 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-[--color-terracotta]" />
        </div>
      </div>
      <div className="flex gap-4 text-xs text-[--color-stone-900]/60 bg-[--color-stone-50] p-3 rounded">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> Virtual</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Tomorrow, 10:00 AM</span>
      </div>
    </div>
  </div>
);

const RecruiterUI = () => (
  <div className="w-full h-full bg-white rounded-md shadow-lg overflow-hidden p-6 border border-[--color-stone-900]/5 transition-transform duration-300 hover:scale-[1.01] hover:shadow-xl">
    <div className="flex justify-between items-center mb-6">
      <div className="text-xs uppercase tracking-widest text-[--color-stone-900]/50 font-bold">Candidates</div>
      <div className="bg-[--color-stone-900]/5 px-2 py-0.5 rounded-full text-[10px] text-[--color-stone-900]">124 Match</div>
    </div>
    <div className="flex flex-col gap-3">
      <div className="bg-white border border-[--color-stone-900]/10 p-3 hover:border-[--color-terracotta]/30 transition-colors flex justify-between items-center group rounded-sm shadow-sm">
        <div className="flex gap-3 items-center">
          <div className="w-8 h-8 rounded-full bg-[--color-stone-100]"></div>
          <div>
            <div className="font-medium text-sm text-[--color-stone-900]">Michael Chen</div>
            <div className="text-[10px] text-[--color-stone-800]/60">B.Tech IT • 8.9 CGPA</div>
          </div>
        </div>
        <span className="text-[10px] text-[--color-terracotta] bg-[--color-terracotta]/10 px-2 py-1 rounded">Top 5%</span>
      </div>
      <div className="bg-white border border-[--color-stone-900]/5 p-3 flex justify-between items-center rounded-sm shadow-sm opacity-80">
        <div className="flex gap-3 items-center">
          <div className="w-8 h-8 rounded-full bg-[--color-stone-100]"></div>
          <div>
            <div className="font-medium text-sm text-[--color-stone-900]">Sarah Jenkins</div>
            <div className="text-[10px] text-[--color-stone-800]/60">B.Tech CS • 9.1 CGPA</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AnalyticsUI = () => (
  <div className="w-full h-full bg-white rounded-md shadow-lg overflow-hidden p-6 flex flex-col gap-6 border border-[--color-stone-900]/5 transition-transform duration-300 hover:scale-[1.01] hover:shadow-xl">
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-[--color-stone-50] p-4 rounded-sm border border-[--color-stone-900]/5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[--color-stone-900]/40 mb-2">Total Placed</div>
        <div className="font-serif text-3xl text-[--color-stone-900]">412</div>
      </div>
      <div className="bg-[--color-stone-50] p-4 rounded-sm border border-[--color-stone-900]/5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[--color-stone-900]/40 mb-2">Avg Package</div>
        <div className="font-serif text-3xl text-[--color-terracotta]">8.4<span className="text-sm ml-1 text-[--color-stone-900]/40">LPA</span></div>
      </div>
    </div>
    <div className="flex-1 border-b border-l border-[--color-stone-900]/10 flex items-end justify-between px-2 pb-0 pt-4 gap-2">
      {[40, 60, 45, 80, 55, 90].map((h, i) => (
        <motion.div 
          key={i} 
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
          className="w-full bg-[--color-stone-900]/10 hover:bg-[--color-terracotta] transition-colors rounded-t-sm" 
        />
      ))}
    </div>
  </div>
);

const Landing = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Observer for Product Explorer
  useEffect(() => {
    const explorerObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const index = parseInt(entry.target.getAttribute('data-index'));
          setActiveFeature(index);
        }
      });
    }, { threshold: 0.5, rootMargin: "-20% 0px -40% 0px" });
    
    const items = document.querySelectorAll('.feature-item');
    items.forEach(item => explorerObserver.observe(item));
    return () => explorerObserver.disconnect();
  }, []);

  const features = [
    { id: '01', title: 'Student Profile', desc: 'Build and manage your professional identity.', ui: <StudentProfileUI /> },
    { id: '02', title: 'Applications', desc: 'Track opportunities from application to outcome.', ui: <ApplicationsUI /> },
    { id: '03', title: 'Interview Tracking', desc: 'Keep interviews and progress organized.', ui: <InterviewsUI /> },
    { id: '04', title: 'Recruiter Discovery', desc: 'Discover and evaluate candidates.', ui: <RecruiterUI /> },
    { id: '05', title: 'Placement Analytics', desc: 'Understand recruitment performance.', ui: <AnalyticsUI /> }
  ];

  return (
    <div className="min-h-screen bg-[--color-stone-50] text-[--color-stone-900] font-sans selection:bg-[--color-terracotta] selection:text-white">
      
      {/* HEADER */}
      <header className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 px-6 md:px-12 xl:px-24 flex justify-between items-center",
        scrollY > 20 ? "py-4 bg-[--color-stone-50]/95 backdrop-blur-sm border-b border-[--color-stone-900]/10 shadow-sm" : "py-6 md:py-8 bg-transparent border-b border-transparent"
      )}>
        <div className="font-serif text-2xl md:text-3xl tracking-tight font-medium relative z-10">
          CareerBridge<span className="text-[--color-terracotta] italic">.</span>
        </div>
        
        <nav className="hidden md:flex gap-10 text-xs md:text-sm uppercase tracking-[0.2em] font-medium items-center relative z-10">
          <Link to="/login" className="group flex items-center gap-2 border-b border-transparent transition-all pb-1 hover:border-[--color-terracotta] hover:text-[--color-terracotta]">
            Sign in
            <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </nav>

        <button className="md:hidden p-2 relative z-50" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu className="w-6 h-6 text-[--color-stone-900]" />
        </button>
      </header>

      {/* Mobile Menu */}
      <div className={cn(
        "fixed inset-0 z-40 transition-transform duration-500 ease-in-out md:hidden flex flex-col justify-center items-center gap-12 bg-[--color-stone-50] text-[--color-stone-900]",
        isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
      )}>
        <Link to="/login" className="font-serif text-4xl transition-colors hover:text-[--color-terracotta]">Sign in</Link>
        <button onClick={() => setIsMobileMenuOpen(false)} className="absolute bottom-12 text-sm uppercase tracking-widest border-b border-[--color-stone-900]/30 pb-1">Close</button>
      </div>

      {/* CHAPTER 1: HERO */}
      <section className="relative min-h-[90vh] flex flex-col justify-end px-6 md:px-12 xl:px-24 pb-16 md:pb-24 pt-40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 items-end">
          <div className="lg:col-span-8">
            <h1 className="font-serif fluid-h1 -ml-1 md:-ml-2 flex flex-col">
              <motion.span 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              >
                The canvas
              </motion.span>
              <motion.span 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              >
                <span className="italic font-light text-[--color-terracotta] mr-4">of your</span>career.
              </motion.span>
            </h1>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="lg:col-span-4 pb-2 md:pb-4 lg:pb-8 flex flex-col justify-end"
          >
            <p className="text-base md:text-lg font-light leading-relaxed text-[--color-stone-800]">
              Not just a platform. An ecosystem where students, recruiters, and institutions converge to shape the future of professional placement with clarity and precision.
            </p>
            <div className="mt-8 md:mt-12 w-full h-[1px] bg-[--color-stone-900]/10 overflow-hidden">
              <motion.div 
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                className="w-full h-full bg-[--color-stone-900]/30 origin-left"
              />
            </div>
            <div className="mt-6 flex justify-between text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold text-[--color-stone-900]/60">
              <span>01. Ecosystem</span>
              <span>Scroll to explore ↓</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CHAPTER 2: PRODUCT EXPLORER */}
      <section className="px-6 md:px-12 xl:px-24 py-24 md:py-32 relative bg-[--color-stone-100]">
        <div className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <span className="text-[--color-terracotta] font-serif text-3xl md:text-4xl mb-4 block opacity-60">01</span>
            <h2 className="text-4xl md:text-5xl font-serif leading-tight">Explore the<br/><i className="text-[--color-terracotta]">Platform</i></h2>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-16 relative items-start">
          {/* Left: Features List */}
          <div className="lg:w-5/12 flex flex-col gap-8 lg:pb-[30vh]">
            {features.map((feature, idx) => (
              <div 
                key={feature.id} 
                data-index={idx}
                className={cn(
                  "feature-item cursor-pointer group transition-opacity duration-300 py-4 border-b border-[--color-stone-900]/10",
                  activeFeature === idx ? "opacity-100" : "opacity-40 hover:opacity-70"
                )}
                onClick={() => setActiveFeature(idx)}
              >
                <div className="flex items-start gap-6">
                  <span className={cn(
                    "font-serif text-xl md:text-2xl transition-colors duration-300",
                    activeFeature === idx ? "text-[--color-terracotta]" : "text-[--color-stone-900]/40"
                  )}>{feature.id}</span>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-medium font-serif mb-2 transition-colors duration-300 group-hover:text-[--color-terracotta]">{feature.title}</h3>
                    <p className="text-sm md:text-base text-[--color-stone-800]/70 font-light">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Sticky Visual */}
          <div className="lg:w-7/12 w-full lg:sticky top-32 lg:h-[60vh] flex items-center justify-center">
            <div className="relative w-full max-w-xl aspect-[4/3] md:aspect-[16/10]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="absolute inset-0 w-full h-full"
                >
                  {features[activeFeature].ui}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>


      {/* CHAPTER 5: FINAL CTA */}
      <section className="py-24 md:py-32 flex flex-col items-center justify-center text-center px-6 border-t border-[--color-stone-900]/10 bg-[--color-stone-100]">
        <h2 className="font-serif fluid-h2 mb-10 md:mb-12 text-[--color-stone-900]">
          Everything you need.<br/>
          <span className="italic text-[--color-stone-900]/50">One place.</span>
        </h2>
        
        <Link to="/login" className="group px-8 py-4 bg-gray-900 text-white flex items-center gap-3 rounded-md transition-all duration-300 hover:bg-[--color-terracotta] shadow-lg">
          <span className="text-xs uppercase tracking-[0.15em] font-medium">Sign in</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-12 xl:px-24 py-10 md:py-12 flex flex-col md:flex-row justify-between items-start md:items-center border-t border-[--color-stone-900]/10 gap-6 md:gap-0 bg-white">
        <div className="font-serif text-xl tracking-tight font-medium text-[--color-stone-900]">
          CareerBridge<span className="text-[--color-terracotta] italic">.</span>
        </div>
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium text-[--color-stone-900]/60">
          <Link to="/" className="hover:text-[--color-terracotta] transition-colors">Privacy</Link>
          <Link to="/" className="hover:text-[--color-terracotta] transition-colors">Terms</Link>
          <Link to="/" className="hover:text-[--color-terracotta] transition-colors">Contact</Link>
        </div>
        <div className="text-[10px] md:text-xs tracking-[0.1em] font-serif italic text-[--color-stone-900]/40">
          © {new Date().getFullYear()} All rights reserved.
        </div>
      </footer>

    </div>
  );
};

export default Landing;
