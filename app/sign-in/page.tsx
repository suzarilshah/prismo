"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStackApp, useUser } from "@stackframe/stack";
import { Eye, EyeOff, Loader2, ArrowRight, Lock, Mail, Fingerprint, Shield, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/logo";
import { toast } from "sonner";

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  
  const stackApp = useStackApp();
  const user = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (user) {
      router.push(redirect);
    }
  }, [user, router, redirect]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await stackApp.signInWithCredential({ email, password });
      if (result.status === "error") {
        setError(result.error.message || "Failed to sign in");
      } else {
        toast.success("Welcome back!");
        router.push(redirect);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);
    try {
      await stackApp.signInWithOAuth("google");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google");
      setIsGoogleLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setError("");
    setIsPasskeyLoading(true);
    try {
      const result = await stackApp.signInWithPasskey();
      if (result.status === "error") {
        setError(result.error.message || "Failed to sign in with passkey");
      } else {
        toast.success("Welcome back!");
        router.push(redirect);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with passkey");
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-card">
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-emerald-500/10 to-transparent blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="mb-12"><Logo href="/" size="lg" /></div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-5xl font-bold mb-4 tracking-tight">Welcome back</h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Sign in to continue managing your finances with Prismo.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mt-12 space-y-5">
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div><p className="font-medium text-foreground">Bank-grade security</p><p className="text-sm">256-bit encryption & passkey support</p></div>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-emerald-500" />
              </div>
              <div><p className="font-medium text-foreground">AI-powered insights</p><p className="text-sm">Smart tax optimization for Malaysia</p></div>
            </div>
          </motion.div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center"><Logo href="/" size="md" className="inline-block" /></div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 tracking-tight">Sign in</h2>
            <p className="text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="text-primary hover:text-primary/80 font-medium transition-colors">Sign up</Link>
            </p>
          </div>
          <div className="space-y-3 mb-6">
            <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={isGoogleLoading} className="w-full h-12 rounded-xl border-border bg-card hover:bg-muted/50 transition-all duration-200">
              {isGoogleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><GoogleIcon className="h-5 w-5 mr-3" /><span className="font-medium">Continue with Google</span></>}
            </Button>
            <Button type="button" variant="outline" onClick={handlePasskeySignIn} disabled={isPasskeyLoading} className="w-full h-12 rounded-xl border-border bg-card hover:bg-muted/50 transition-all duration-200">
              {isPasskeyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Fingerprint className="h-5 w-5 mr-3 text-primary" /><span className="font-medium">Sign in with Passkey</span></>}
            </Button>
          </div>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-4 text-muted-foreground tracking-wider">or continue with email</span></div>
          </div>
          <form onSubmit={handleEmailSignIn} className="space-y-5">
            {error && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</motion.div>}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 pl-12 bg-card border-border focus:border-primary/50 focus:ring-primary/20 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Link href="/handler/forgot-password" className="text-sm text-primary hover:text-primary/80 transition-colors">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 pl-12 pr-12 bg-card border-border focus:border-primary/50 focus:ring-primary/20 rounded-xl" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 transition-all duration-200">
              {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Signing in...</> : <>Sign in<ArrowRight className="ml-2 h-5 w-5" /></>}
            </Button>
          </form>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-foreground/70 hover:text-foreground transition-colors underline-offset-4 hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-foreground/70 hover:text-foreground transition-colors underline-offset-4 hover:underline">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
