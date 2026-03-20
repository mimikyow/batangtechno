"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/card";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Rocket, ShieldCheck, User as UserIcon, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/dialog";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // If environment credentials match, ensure the user exists or is verified
      const isAdminByEnv = email === ADMIN_EMAIL && password === ADMIN_PASSWORD;

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 1. Check if user is the environment-defined Admin
      if (isAdminByEnv || user.email === ADMIN_EMAIL) {
        await setDoc(doc(db, "roles_admin", user.uid), {
          id: user.uid,
          externalAuthId: user.uid,
          email: user.email,
          name: "System Admin",
          role: "admin"
        }, { merge: true });
        
        toast({ title: "Command Access Authorized", description: "Logged in as Primary Admin" });
        router.push("/admin");
        return;
      }
      
      // 2. Check if user is a Judge in Firestore
      const judgeDoc = await getDoc(doc(db, "roles_judge", user.uid));

      if (judgeDoc.exists()) {
        toast({ title: "Judge Session Initiated", description: `Logged in as ${judgeDoc.data().name}` });
        router.push("/judge");
      } else {
        toast({ title: "Access Granted", description: "Standard Viewer Session" });
        router.push("/");
      }

    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Auth Failed", 
        description: "Invalid credentials or unauthorized access." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your email address." });
      return;
    }

    setIsResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({ 
        title: "Security Link Dispatched", 
        description: "Check your inbox (and spam folder)." 
      });
      setIsResetOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <Card className="w-full max-w-md glass-card relative z-10 border-white/10 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
            <Rocket className="w-8 h-8 text-accent animate-pulse" />
          </div>
          <CardTitle className="text-3xl font-black italic glow-accent text-white uppercase">
            Secure Access
          </CardTitle>
          <CardDescription className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">
            Enter your credentials
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent mb-1 uppercase tracking-tighter">
                <UserIcon className="w-3 h-3" /> Identity (Email)
              </div>
              <Input 
                type="email" 
                placeholder="email@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/20 border-white/10 text-white placeholder:text-muted-foreground focus:border-accent transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent mb-1 uppercase tracking-tighter">
                <ShieldCheck className="w-3 h-3" /> Security Code
              </div>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black/20 border-white/10 text-white focus:border-accent transition-all pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="text-xs text-muted-foreground hover:text-accent p-0 h-auto">
                    Forgot Password?
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold uppercase italic">Reset Password</DialogTitle>
                    <CardDescription>Enter your email to receive a secure reset link.</CardDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Email Address</label>
                      <Input 
                        type="email" 
                        placeholder="your@email.com" 
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsResetOpen(false)} className="uppercase text-xs">Cancel</Button>
                    <Button className="bg-accent uppercase text-xs font-bold" onClick={handleForgotPassword} disabled={isResetLoading}>
                      {isResetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-accent hover:bg-accent/80 font-bold py-6 text-lg transition-all shadow-[0_0_15px_rgba(51,153,255,0.3)]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Initiate Connection"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}