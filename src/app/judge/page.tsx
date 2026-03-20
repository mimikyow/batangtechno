
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Info, AlertCircle, ShieldAlert, Loader2, Scale, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { getGoogleDriveEmbedUrl } from "@/lib/utils";
import { sendPasswordResetEmail } from "firebase/auth";

const CRITERIA = [
  { 
    key: "mastery", 
    label: "Mastery and Use of Software Concepts", 
    weight: "30%", 
    desc: "Evaluates how effectively the team applies relevant concepts, techniques, and technologies to develop a functional and well-designed solution." 
  },
  { 
    key: "innovation", 
    label: "Novelty and Innovation", 
    weight: "30%", 
    desc: "Assesses the originality of the project and the creativity behind its concept and implementation." 
  },
  { 
    key: "impact", 
    label: "Real-world Impact and Viability", 
    weight: "30%", 
    desc: "Measures how relevant the project is to real-world problems and its potential for practical deployment." 
  },
  { 
    key: "compliance", 
    label: "Compliance to Rules and Restrictions", 
    weight: "10%", 
    desc: "Determines the extent to which the project follows all competition guidelines." 
  },
];

export default function JudgePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const judgeDocRef = useMemoFirebase(() => user ? doc(db, "roles_judge", user.uid) : null, [db, user]);
  
  const { data: judgeRole, isLoading: isJudgeChecking } = useDoc(judgeDocRef);

  const entriesQuery = useMemoFirebase(() => collection(db, "entries"), [db]);
  const { data: entries, isLoading: isEntriesLoading } = useCollection(entriesQuery);

  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [scores, setScores] = useState({
    mastery: 5,
    innovation: 5,
    impact: 5,
    compliance: 5,
    comment: ""
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isJudgeChecking) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="text-muted-foreground uppercase tracking-widest text-xs">Scanning Mission Logs...</p>
      </div>
    );
  }

  if (!judgeRole) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 uppercase italic tracking-tighter">Access Denied</h1>
        <p className="text-muted-foreground max-w-md mb-8">Your credentials do not grant access to the Judge Panel.</p>
        <Button onClick={() => router.push("/login")} variant="outline" className="border-white/20">
          Go to Login
        </Button>
      </div>
    );
  }

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({ title: "Reset Link Sent" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Failed", description: error.message });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSubmitScore = () => {
    if (!user || !selectedEntry) return;

    addDocumentNonBlocking(collection(db, "entries", selectedEntry.id, "scoreSubmissions"), {
      judgeId: user.uid,
      entryId: selectedEntry.id,
      scores,
      submissionDate: new Date().toISOString(),
      adminUploaded: false
    });

    toast({ title: "Score Recorded" });
    setSelectedEntry(null);
    setScores({ mastery: 5, innovation: 5, impact: 5, compliance: 5, comment: "" });
  };

  const selectedEmbedUrl = selectedEntry ? getGoogleDriveEmbedUrl(selectedEntry.googleDriveVideoLink) : "";

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-80 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              Mission Log <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30">{entries?.length || 0}</Badge>
            </h2>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetPassword}
            disabled={isResettingPassword}
            className="w-full border-white/10 text-muted-foreground hover:text-white h-9 text-[10px] uppercase tracking-widest mb-4"
          >
            {isResettingPassword ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <KeyRound className="w-3 h-3 mr-2" />}
            Change My Password
          </Button>

          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2">
            {isEntriesLoading ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
            ) : entries?.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={`p-4 rounded-lg text-left transition-all border ${
                  selectedEntry?.id === entry.id 
                    ? "bg-accent/10 border-accent shadow-[0_0_10px_rgba(51,153,255,0.2)]" 
                    : "bg-white/5 border-white/10 hover:border-white/30"
                }`}
              >
                <div className="font-bold text-white text-sm">{entry.teamName}</div>
                <div className="text-[10px] text-muted-foreground uppercase">{entry.projectSchool}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {selectedEntry ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-6">
                  <div>
                    <h1 className="text-4xl font-black text-white glow-accent italic">{selectedEntry.teamName}</h1>
                    <p className="text-accent font-semibold">{selectedEntry.challengeId}</p>
                  </div>
                  
                  <div className="aspect-video relative rounded-2xl overflow-hidden border border-white/10 bg-black">
                     <iframe
                        width="100%"
                        height="100%"
                        src={selectedEmbedUrl}
                        title="Pitch Video"
                        allowFullScreen
                      ></iframe>
                  </div>

                  <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-accent" /> Project Brief
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{selectedEntry.projectDescription}</p>
                  </div>
                </div>

                <div className="w-full lg:w-[450px] glass-card p-8 rounded-2xl border-accent/30 shadow-glow">
                  <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold text-white">Evaluation Matrix</h3>
                    <Scale className="w-5 h-5 text-accent/50" />
                  </div>
                  
                  <div className="space-y-8">
                    {CRITERIA.map(crit => (
                      <div key={crit.key} className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <label className="text-sm font-bold text-white leading-tight">{crit.label}</label>
                            <Badge variant="outline" className="w-fit text-[9px] h-4 px-1 mt-1 border-accent/30 text-accent">{crit.weight} Weight</Badge>
                          </div>
                          <span className="text-accent font-mono text-lg">{(scores as any)[crit.key]} / 10</span>
                        </div>
                        <Slider 
                          max={10} 
                          step={1} 
                          value={[(scores as any)[crit.key]]} 
                          onValueChange={(val) => setScores({...scores, [crit.key]: val[0]})}
                        />
                        <p className="text-[10px] text-muted-foreground italic leading-relaxed">{crit.desc}</p>
                      </div>
                    ))}

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-white">Judge's Final Thoughts</label>
                      <Textarea 
                        placeholder="" 
                        className="bg-black/20 border-white/10 h-24 text-sm"
                        value={scores.comment}
                        onChange={e => setScores({...scores, comment: e.target.value})}
                      />
                    </div>

                    <Button className="w-full bg-accent hover:bg-accent/80 py-6 text-white font-bold uppercase tracking-widest" onClick={handleSubmitScore}>
                      <CheckCircle className="w-5 h-5 mr-2" /> Submit Evaluation
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-40 glass-card rounded-2xl border-dashed border-2">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <AlertCircle className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Awaiting Selection</h2>
              <p className="text-muted-foreground max-w-xs">Please select a mission from the log to begin evaluation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
