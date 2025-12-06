"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  BarChart3, 
  CreditCard, 
  Globe, 
  Shield,
  Zap,
  Check,
  ChevronRight,
  Play
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Star, Lock, TrendingUp } from "lucide-react";
import { Logo } from "@/components/logo";

// Animated counter component
function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, target]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const metrics = [
  { value: 2.4, suffix: "B+", prefix: "RM ", label: "Assets Tracked" },
  { value: 15000, suffix: "+", prefix: "", label: "Active Users" },
  { value: 99.9, suffix: "%", prefix: "", label: "Uptime SLA" },
];

const testimonials = [
  {
    quote: "Prismo transformed how I manage my finances. The tax optimization alone saved me RM 12,000 last year.",
    author: "Sarah Chen",
    role: "Startup Founder",
    avatar: "SC"
  },
  {
    quote: "Finally, a finance app that understands Malaysian tax laws. The LHDN integration is seamless.",
    author: "Ahmad Razak",
    role: "Senior Engineer",
    avatar: "AR"
  },
  {
    quote: "I've tried Mercury, Wise, everything. Prismo is the only one built for Malaysian professionals.",
    author: "Michelle Tan",
    role: "Product Manager",
    avatar: "MT"
  }
];

const trustedBy = [
  "Petronas", "Maybank", "CIMB", "Grab", "AirAsia", "Axiata"
];

const features = [
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track income, expenses, and cash flow with precision. Live dashboards update every second.",
    color: "from-blue-500 to-cyan-500",
    size: "large"
  },
  {
    icon: CreditCard,
    title: "Smart Transactions",
    description: "Auto-categorize expenses with AI. Never miss a tax deduction.",
    color: "from-purple-500 to-pink-500",
    size: "small"
  },
  {
    icon: Shield,
    title: "Bank-grade Security",
    description: "256-bit encryption. SOC 2 Type II certified.",
    color: "from-emerald-500 to-teal-500",
    size: "small"
  },
  {
    icon: Globe,
    title: "Multi-currency",
    description: "Hold MYR, USD, SGD seamlessly. Real-time exchange rates.",
    color: "from-orange-500 to-yellow-500",
    size: "small"
  },
  {
    icon: Zap,
    title: "Automation",
    description: "Set up recurring payments, budget alerts, and goal tracking on autopilot.",
    color: "from-violet-500 to-purple-500",
    size: "large"
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-blue-600/20 via-purple-600/10 to-transparent blur-[120px] opacity-60" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[400px] bg-gradient-to-tr from-emerald-600/10 to-transparent blur-[100px]" />
      </div>

      {/* Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none grid-pattern" />

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="fixed top-0 w-full z-50 px-6 py-4"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-6 py-3 rounded-2xl bg-card/50 backdrop-blur-xl border border-border">
            <Logo href="/" size="sm" />
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted/50">
                  Sign In
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl px-5">
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center pt-32 pb-16 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-5xl mx-auto text-center"
        >
          <motion.div 
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
              <span className="text-muted-foreground">Backed by <span className="text-orange-400 font-semibold">Y Combinator</span></span>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">W24</span>
            </motion.div>
            
            {/* Headline */}
            <motion.h1 variants={fadeInUp} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95]">
              <span className="block">Financial clarity</span>
              <span className="block mt-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                starts here.
              </span>
            </motion.h1>
            
            {/* Subheadline */}
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The intelligent finance platform for modern Malaysians. 
              Track expenses, optimize taxes, and build wealth — all in one place.
            </motion.p>
            
            {/* CTAs */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl text-base shadow-2xl shadow-blue-500/25 border-0">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 bg-white/5 hover:bg-white/10 border-white/10 text-white rounded-xl text-base backdrop-blur-sm">
                <Play className="mr-2 w-4 h-4" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div variants={fadeInUp} className="flex items-center justify-center gap-6 pt-4 text-sm">
              <div className="flex items-center gap-2 text-white/40">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>SOC 2 Certified</span>
              </div>
              <div className="flex items-center gap-2 text-white/40">
                <Lock className="w-4 h-4 text-blue-500" />
                <span>PDPA Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-white/40">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>4.9/5 Rating</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview - CENTERED */}
        <motion.div 
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-5xl mx-auto mt-16 px-6"
        >
          {/* Animated gradient border */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl opacity-40 blur-sm" />
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-purple-500/20 blur-3xl opacity-50" />
            
            {/* Dashboard Frame */}
            <div className="relative rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl shadow-black/50">
              {/* Browser Chrome */}
              <div className="h-11 bg-[#1a1a1a] border-b border-white/5 flex items-center px-4 gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 text-xs text-white/40">
                    <Lock className="w-3 h-3" />
                    app.prismo.finance
                  </div>
                </div>
                <div className="w-16" />
              </div>
              
              {/* Dashboard Content */}
              <div className="p-6 grid grid-cols-12 gap-4 h-[300px] overflow-hidden">
                {/* Sidebar Placeholder */}
                <div className="col-span-2 space-y-3 border-r border-white/5 pr-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`h-8 rounded-lg ${i === 1 ? 'bg-blue-500/20' : 'bg-white/5'}`} />
                  ))}
                </div>
                
                {/* Main Content */}
                <div className="col-span-10 space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-center">
                    <div className="h-8 w-40 rounded-lg bg-white/10" />
                    <div className="h-8 w-24 rounded-lg bg-blue-500/20" />
                  </div>
                  
                  {/* Stats Cards */}
                  <div className="grid grid-cols-4 gap-3">
                    {['bg-emerald-500/10', 'bg-blue-500/10', 'bg-purple-500/10', 'bg-orange-500/10'].map((bg, i) => (
                      <div key={i} className={`p-4 rounded-xl ${bg} border border-white/5`}>
                        <div className="h-3 w-16 bg-white/20 rounded mb-3" />
                        <div className="h-6 w-24 bg-white/30 rounded" />
                      </div>
                    ))}
                  </div>
                  
                  {/* Chart */}
                  <div className="h-32 rounded-xl bg-white/5 border border-white/5 p-4 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 flex items-end gap-1 px-4 pb-2">
                      {[40, 65, 45, 80, 55, 70, 60, 90, 50, 85, 75, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-t opacity-60" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </motion.div>

        {/* Metrics - Below dashboard */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-wrap justify-center gap-12 md:gap-20 mt-20"
        >
          {metrics.map((metric, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white">
                <AnimatedCounter target={metric.value} prefix={metric.prefix} suffix={metric.suffix} />
              </div>
              <div className="text-sm text-white/40 mt-1">{metric.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Trusted By */}
      <section className="relative py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-white/30 uppercase tracking-widest mb-10">Trusted by leading companies</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
            {trustedBy.map((brand, i) => (
              <span key={i} className="text-xl font-bold text-white/20 hover:text-white/40 transition-colors cursor-default">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Everything you need to
              <br />
              <span className="text-white/40">master your money</span>
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Built for Malaysian professionals who want complete control over their financial future.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`group p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 hover:bg-white/[0.04] transition-all duration-500 ${feature.size === 'large' ? 'md:col-span-2 lg:col-span-1' : ''}`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-white/50 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Loved by thousands
            </h2>
            <p className="text-lg text-white/50">
              See what Malaysian professionals are saying about Prismo.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05] hover:border-white/10 transition-all"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-white/70 leading-relaxed mb-8">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-white/40">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Press Section */}
      <section className="relative py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-white/30 uppercase tracking-widest mb-8">Featured in</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {["TechCrunch", "The Star", "Digital News Asia", "e27", "Tech in Asia"].map((logo, i) => (
              <span key={i} className="text-lg font-semibold text-white/20 hover:text-white/40 transition-colors cursor-default">{logo}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 via-purple-600/5 to-transparent" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Ready to take control?
          </h2>
          <p className="text-xl text-white/50 mb-10 max-w-2xl mx-auto">
            Join thousands of Malaysians already building their financial future with Prismo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="h-14 px-10 bg-white text-black hover:bg-white/90 font-bold rounded-xl text-lg">
                Get Started Free
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-white/40">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>No credit card</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
            <div className="col-span-2">
              <div className="mb-4">
                <Logo href="/" size="sm" />
              </div>
              <p className="text-white/40 text-sm max-w-xs leading-relaxed">
                The intelligent finance platform for modern Malaysians. Track, optimize, and grow.
              </p>
            </div>
            
            {[
              { title: "Product", links: ["Features", "Pricing", "Security", "Roadmap"] },
              { title: "Company", links: ["About", "Careers", "Blog", "Press"] },
              { title: "Legal", links: ["Privacy", "Terms", "Compliance"] }
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-4 text-white/80">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <Link href="#" className="text-sm text-white/40 hover:text-white transition-colors">{link}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 text-sm text-white/30">
            <p>© 2025 Prismo Finance Sdn Bhd. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <span className="hover:text-white transition-colors cursor-pointer">Twitter</span>
              <span className="hover:text-white transition-colors cursor-pointer">LinkedIn</span>
              <span className="hover:text-white transition-colors cursor-pointer">GitHub</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
