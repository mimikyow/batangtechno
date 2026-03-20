"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Rocket, ShieldCheck, User as UserIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Welcome back", description: "Authentication successful." });
      router.push("/");
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Login Failed", 
        description: error.message || "Please check your credentials." 
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
          <CardTitle className="text-3xl font-black italic glow-accent text-white">
            SECURE ACCESS
          </CardTitle>
          <CardDescription className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">
            Enter the Batang Techno Nebula
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent mb-1 uppercase tracking-tighter">
                <UserIcon className="w-3 h-3" /> Identity (Email)
              </div>
              <Input 
                type="email" 
                placeholder="commander@techno.space" 
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
            <p className="text-[10px] text-center text-muted-foreground uppercase italic">
              Restricted to Judges and Command Center Personnel
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
