
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Rocket, ShieldCheck, User as UserIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let userCredential;
      try {
        // Attempt login first
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (error: any) {
        // If user doesn't exist, create them for this prototype
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } else {
          throw error;
        }
      }

      const user = userCredential.user;

      // Hardcoded Role Assignment logic
      if (email === "admin@email.com") {
        await setDoc(doc(db, "roles_admin", user.uid), {
          id: user.uid,
          email: user.email,
          role: "admin",
          name: "System Admin"
        });
      } else if (email === "judge@email.com") {
        await setDoc(doc(db, "roles_judge", user.uid), {
          id: user.uid,
          email: user.email,
          role: "judge",
          name: "Panel Judge"
        });
      }

      toast({ title: "Access Granted", description: `Welcome back, ${email === 'admin@email.com' ? 'Administrator' : email === 'judge@email.com' ? 'Judge' : 'User'}.` });
      
      // Redirect based on role
      if (email === "admin@email.com") router.push("/admin");
      else if (email === "judge@email.com") router.push("/judge");
      else router.push("/");

    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Auth Failed", 
        description: error.message || "Invalid credentials." 
      });
    } finally {
      setIsLoading(false);
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
            Enter your credentials for the Batang Techno Nebula
          </CardDescription>
          <div className="bg-white/5 p-3 rounded-md text-[10px] text-muted-foreground text-left space-y-1">
            <p className="font-bold text-accent">PROTOTYPE CREDENTIALS:</p>
            <p>Admin: admin@email.com / admin</p>
            <p>Judge: judge@email.com / judge</p>
          </div>
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
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/20 border-white/10 text-white focus:border-accent transition-all"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
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
