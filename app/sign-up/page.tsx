"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, Loader2, ArrowRight, Lock, Mail, User, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/logo";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  // Password strength checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signUp(email, password, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
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
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-600/20 via-blue-600/10 to-transparent" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-pink-600/10 to-transparent blur-3xl" />
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
            Start your journey
          </h1>
          <p className="text-lg text-white/50 max-w-md">
            Join thousands of Malaysians who are taking control of their finances with Prismo.
          </p>
          
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 text-white/40">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm">Free 14-day trial, no credit card required</span>
            </div>
            <div className="flex items-center gap-3 text-white/40">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm">PDPA compliant data protection</span>
            </div>
            <div className="flex items-center gap-3 text-white/40">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <span className="text-purple-400 text-sm font-bold">RM</span>
              </div>
              <span className="text-sm">LHDN tax optimization built-in</span>
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
            <h2 className="text-2xl font-bold mb-2">Create your account</h2>
            <p className="text-white/50">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-blue-400 hover:text-blue-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <Label htmlFor="name" className="text-white/70">Full Name</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Ahmad Razak"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12 pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl"
                />
              </div>
            </div>

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
              <Label htmlFor="password" className="text-white/70">Password</Label>
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
              
              {/* Password strength indicators */}
              {password && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 space-y-2"
                >
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-2 ${hasMinLength ? 'text-emerald-400' : 'text-white/30'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasMinLength ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                        {hasMinLength && <Check className="w-3 h-3" />}
                      </div>
                      8+ characters
                    </div>
                    <div className={`flex items-center gap-2 ${hasUppercase ? 'text-emerald-400' : 'text-white/30'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasUppercase ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                        {hasUppercase && <Check className="w-3 h-3" />}
                      </div>
                      Uppercase letter
                    </div>
                    <div className={`flex items-center gap-2 ${hasLowercase ? 'text-emerald-400' : 'text-white/30'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasLowercase ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                        {hasLowercase && <Check className="w-3 h-3" />}
                      </div>
                      Lowercase letter
                    </div>
                    <div className={`flex items-center gap-2 ${hasNumber ? 'text-emerald-400' : 'text-white/30'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasNumber ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                        {hasNumber && <Check className="w-3 h-3" />}
                      </div>
                      Number
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || !hasMinLength || !hasUppercase || !hasLowercase || !hasNumber}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-white/30">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-white/50 hover:text-white transition-colors">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-white/50 hover:text-white transition-colors">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
