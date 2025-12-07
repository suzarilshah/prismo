"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
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
  Play,
  Sparkles,
  Brain,
  MessageSquare,
  Receipt,
  Target,
  Calculator,
  Bot,
  Wallet,
  PieChart,
  TrendingUp,
  FileText,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Star, Lock } from "lucide-react";
import { Logo } from "@/components/logo";

// Structured Data for SEO (JSON-LD)
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://prismo.airail.uk/#webapp",
      "name": "Prismo Finance",
      "description": "Smart money management for Malaysians. Track expenses, optimize taxes with LHDN integration, manage subscriptions, and achieve financial goals.",
      "url": "https://prismo.airail.uk",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "MYR",
        "description": "Free trial available"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "1247",
        "bestRating": "5",
        "worstRating": "1"
      },
      "featureList": [
        "Expense Tracking",
        "Budget Management", 
        "Tax Optimization (LHDN)",
        "Subscription Tracking",
        "AI Financial Assistant",
        "Goal Setting",
        "Credit Card Management",
        "Financial Forecasting"
      ]
    },
    {
      "@type": "Organization",
      "@id": "https://prismo.airail.uk/#organization",
      "name": "Prismo Finance Sdn Bhd",
      "url": "https://prismo.airail.uk",
      "logo": {
        "@type": "ImageObject",
        "url": "https://prismo.airail.uk/logos/prismo-logo-dark.svg"
      },
      "sameAs": [
        "https://twitter.com/prismofinance",
        "https://linkedin.com/company/prismofinance"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "availableLanguage": ["English", "Malay"]
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://prismo.airail.uk/#website",
      "url": "https://prismo.airail.uk",
      "name": "Prismo Finance",
      "description": "The intelligent finance platform for modern Malaysians",
      "publisher": {
        "@id": "https://prismo.airail.uk/#organization"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://prismo.airail.uk/dashboard/transactions?search={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "SoftwareApplication",
      "name": "Prismo Finance",
      "applicationCategory": "FinanceApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "MYR"
      },
      "screenshot": "https://prismo.airail.uk/og-image.png"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Prismo Finance?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Prismo Finance is an intelligent personal finance platform designed for Malaysians. It helps you track expenses, optimize taxes with LHDN integration, manage subscriptions, and achieve your financial goals with AI-powered insights."
          }
        },
        {
          "@type": "Question", 
          "name": "Is Prismo Finance free to use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, Prismo Finance offers a free trial with full access to all features. You can start managing your finances immediately without any credit card required."
          }
        },
        {
          "@type": "Question",
          "name": "Does Prismo help with Malaysian taxes?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! Prismo integrates with LHDN tax categories and automatically tracks eligible tax reliefs. It helps Malaysian users maximize their tax deductions and provides PCB calculations."
          }
        }
      ]
    }
  ]
};

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
  },
  {
    icon: CreditCard,
    title: "Smart Transactions",
    description: "Auto-categorize expenses with AI. Never miss a tax deduction.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Shield,
    title: "Bank-grade Security",
    description: "256-bit encryption. SOC 2 Type II certified.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Calculator,
    title: "LHDN Tax Calculator",
    description: "Malaysian tax optimization built-in. Maximize reliefs automatically.",
    color: "from-orange-500 to-yellow-500",
  },
  {
    icon: Target,
    title: "Goal Tracking",
    description: "Set financial goals and watch your progress with visual milestones.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Wallet,
    title: "Subscription Manager",
    description: "Track all recurring payments. Get alerts before renewals.",
    color: "from-violet-500 to-purple-500",
  }
];

const aiFeatures = [
  {
    icon: MessageSquare,
    title: "Spending Analysis",
    description: "Analyze spending patterns and identify savings opportunities",
  },
  {
    icon: Target,
    title: "Goal Progress",
    description: "Track progress towards financial goals with AI insights",
  },
  {
    icon: PieChart,
    title: "Budget Health",
    description: "Monitor budget performance and get optimization tips",
  },
  {
    icon: Calculator,
    title: "Tax Optimization",
    description: "Find eligible deductions based on your transactions",
  },
  {
    icon: Receipt,
    title: "Subscription Review",
    description: "Review subscriptions and suggest which to cancel",
  },
  {
    icon: TrendingUp,
    title: "Savings Advice",
    description: "Personalized recommendations to grow your savings",
  },
];

export default function LandingPage() {
  const { setTheme } = useTheme();

  // Force dark mode on landing page
  useEffect(() => {
    setTheme("dark");
  }, [setTheme]);

  return (
    <>
      {/* Structured Data for SEO */}
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30 dark">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200vw] md:w-[1200px] h-[600px] bg-gradient-to-b from-blue-600/20 via-purple-600/10 to-transparent blur-[120px] opacity-60" />
        <div className="absolute bottom-0 left-0 w-[150vw] md:w-[800px] h-[400px] bg-gradient-to-tr from-emerald-600/10 to-transparent blur-[100px]" />
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

            <div className="flex items-center gap-2 md:gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" className="h-11 px-4 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                  Sign In
                </Button>
              </Link>
              <Link href="/dashboard" className="hidden sm:block">
                <Button className="h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl px-5">
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard" className="sm:hidden">
                <Button size="icon" className="h-11 w-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
                  <ArrowRight className="w-5 h-5" />
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
                    prismo.airail.uk
                  </div>
                </div>
                <div className="w-16" />
              </div>
              
              {/* Dashboard Content - Real Screenshot */}
              <div className="relative w-full">
                <Image
                  src="/screenshots/dashboard-preview.png"
                  alt="Prismo Dashboard"
                  width={1920}
                  height={1080}
                  className="w-full h-auto"
                  priority
                />
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
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm mb-6">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 font-medium">Powerful Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Everything you need to
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">master your money</span>
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Built for Malaysian professionals who want complete control over their financial future.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 hover:bg-white/[0.04] transition-all duration-500"
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

      {/* AI Assistant Section - HERO */}
      <section className="relative py-32 overflow-hidden">
        {/* AI Glow Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-pink-600/20 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 text-sm mb-6">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="text-violet-400 font-medium">AI-Powered</span>
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold">NEW</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Meet <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Prismo AI</span>
                <br />
                <span className="text-white/60">Your Financial Assistant</span>
              </h2>
              
              <p className="text-lg text-white/50 mb-8 leading-relaxed max-w-lg">
                Ask anything about your finances. Get instant insights, personalized recommendations, 
                and actionable advice powered by advanced AI that understands Malaysian tax laws.
              </p>

              {/* AI Feature Pills */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                {aiFeatures.slice(0, 4).map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-violet-500/20 hover:bg-violet-500/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center group-hover:from-violet-500/30 group-hover:to-purple-500/30 transition-colors">
                      <feature.icon className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-0.5">{feature.title}</h4>
                      <p className="text-xs text-white/40 leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/dashboard">
                  <Button size="lg" className="h-14 px-8 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold rounded-xl text-base shadow-2xl shadow-violet-500/25 border-0">
                    <Bot className="mr-2 w-5 h-5" />
                    Try Prismo AI Free
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-14 px-8 bg-white/5 hover:bg-white/10 border-white/10 text-white rounded-xl text-base backdrop-blur-sm">
                  <Play className="mr-2 w-4 h-4" />
                  See it in action
                </Button>
              </div>
            </motion.div>

            {/* Right - AI Screenshot */}
            <motion.div
              initial={{ opacity: 0, x: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              {/* Animated gradient border */}
              <div className="absolute -inset-[2px] bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 rounded-2xl opacity-50 blur-sm animate-pulse" />
              
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-violet-500/20 to-purple-500/20 blur-3xl opacity-50" />
                
                {/* AI Interface Frame */}
                <div className="relative rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl shadow-violet-500/10">
                  {/* Browser Chrome */}
                  <div className="h-11 bg-[#1a1a1a] border-b border-white/5 flex items-center px-4 gap-3">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                      <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                      <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 text-xs text-white/40">
                        <Sparkles className="w-3 h-3 text-violet-400" />
                        Prismo AI Assistant
                      </div>
                    </div>
                    <div className="w-16" />
                  </div>
                  
                  {/* AI Screenshot */}
                  <div className="relative w-full">
                    <Image
                      src="/screenshots/ai-assistant.png"
                      alt="Prismo AI Assistant"
                      width={1920}
                      height={1080}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30"
              >
                <Brain className="w-6 h-6 text-white" />
              </motion.div>
              
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -left-4 p-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/30"
              >
                <MessageSquare className="w-6 h-6 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Product Demo Video Section */}
      <section className="relative py-32 border-t border-white/5 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-gradient-to-r from-blue-600/20 via-cyan-600/10 to-purple-600/20 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-sm mb-6">
              <Play className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 font-medium">Product Demo</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              See Prismo in
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"> action</span>
            </h2>
            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto">
              Watch how Prismo transforms the way you manage your finances. 
              From expense tracking to tax optimization — all in under 3 minutes.
            </p>
          </motion.div>

          {/* Video Container */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative max-w-5xl mx-auto"
          >
            {/* Animated gradient border */}
            <div className="absolute -inset-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl opacity-50 blur-sm" />
            
            <div className="relative">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-blue-500/10 blur-3xl opacity-50" />
              
              {/* Video Frame */}
              <div className="relative rounded-3xl border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl shadow-cyan-500/10">
                {/* Browser Chrome */}
                <div className="h-11 bg-[#1a1a1a] border-b border-white/5 flex items-center px-4 gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 text-xs text-white/40">
                      <Play className="w-3 h-3 text-cyan-400" />
                      Product Demo
                    </div>
                  </div>
                  <div className="w-16" />
                </div>
                
                {/* Video Player */}
                <div className="relative w-full aspect-video bg-black">
                  <video
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                    preload="metadata"
                    poster="/og-image.png"
                    autoPlay
                    muted
                    loop
                  >
                    <source src="/videos/product-demo.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>

            {/* Floating Feature Pills */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -left-6 md:-left-12 hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 border border-emerald-500/20 shadow-lg backdrop-blur-sm"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Smart Categorization</span>
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-6 -right-6 md:-right-12 hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500/20 to-violet-500/10 border border-violet-500/20 shadow-lg backdrop-blur-sm"
            >
              <Calculator className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium text-violet-400">LHDN Tax Ready</span>
            </motion.div>
          </motion.div>

          {/* Video Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-6 md:gap-12 mt-12 md:mt-16"
          >
            {[
              { icon: BarChart3, text: "Real-time Analytics" },
              { icon: Shield, text: "Bank-grade Security" },
              { icon: Sparkles, text: "AI-Powered Insights" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-white/50">
                <item.icon className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </motion.div>
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
                <ul className="space-y-1">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <Link href="#" className="block py-2 text-sm text-white/40 hover:text-white transition-colors min-h-[44px] flex items-center">{link}</Link>
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
    </>
  );
}
