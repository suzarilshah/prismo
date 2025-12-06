"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, Loader2, ArrowRight, Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/logo";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-emerald-600/10 to-transparent blur-3xl" />
        </div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundSize: '60px 60px',
          backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)'
        }} />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="mb-12">
            <Logo href="/" size="md" />
          </div>
          
          <h1 className="text-4xl font-bold mb-4">
            Welcome back
          </h1>
          <p className="text-lg text-white/50 max-w-md">
            Sign in to continue managing your finances with Prismo. Your financial clarity awaits.
          </p>
          
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 text-white/40">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm">Bank-grade security with 256-bit encryption</span>
            </div>
            <div className="flex items-center gap-3 text-white/40">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <span className="text-emerald-400 text-sm font-bold">MY</span>
              </div>
              <span className="text-sm">Built for Malaysian tax optimization</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Logo href="/" size="sm" className="inline-block" />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Sign in to your account</h2>
            <p className="text-white/50">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="text-blue-400 hover:text-blue-300 transition-colors">
                Sign up
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white/70">Password</Label>
                <Link href="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pl-12 pr-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-white/30">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-white/50 hover:text-white transition-colors">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-white/50 hover:text-white transition-colors">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
