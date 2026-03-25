"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Info, AlertCircle, ShieldAlert, Loader2, Scale, KeyRound, Lock, Presentation, Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from "@/firebase";
import { doc, collection, arrayUnion } from "firebase/firestore";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { getGoogleDriveEmbedUrl } from "@/lib/utils";
import { sendPasswordResetEmail } from "firebase/auth";

const CRITERIA = [
  { 
    key: "mastery", 
    label: "Mastery and Use of Software Concepts", 
    weight: "30%", 
    max: 30,
    desc: "Evaluates how effectively the team applies relevant concepts, techniques, and technologies to develop a functional and well-designed solution. Emphasis is placed on overall quality, efficiency, and appropriate use of available tools and resources." 
  },
  { 
    key: "innovation", 
    label: "Novelty and Innovation", 
    weight: "30%", 
    max: 30,
    desc: "Assesses the originality of the project and the creativity behind its concept and implementation. This includes how the solution introduces new ideas, improves existing approaches, or applies technology in a unique and meaningful way." 
  },
  { 
    key: "impact", 
    label: "Real-world Impact and Viability", 
    weight: "30%", 
    max: 30,
    desc: "Measures how relevant the project is to real-world problems and its potential for practical deployment. Consideration is given to feasibility, scalability, sustainability, and the overall benefit to users or communities." 
  },
  { 
    key: "compliance", 
    label: "Compliance to Rules and Restrictions", 
    weight: "10%", 
    max: 10,
    desc: "Determines the extent to which the project follows all competition guidelines, technical constraints, ethical standards, and submission requirements. Failure to comply may result in point deductions or disqualification." 
  },
];

const COMPLIANCE_DETAILS = "The video must showcase the working prototype, emphasizing its key features and functionality. It should briefly explain the problem, the proposed solution, and its real-world application. Teams must also clearly identify the technologies used, including programming languages, frameworks, libraries, platforms, APIs, and any AI tools. The presentation should reflect the actual state of the prototype—purely conceptual or slide-only videos may receive lower scores. The video length should be 3–5 minutes; failure to meet this may result in deductions.";

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
    mastery: 15,
    innovation: 15,
    impact: 15,
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
        <p className="text-muted-foreground uppercase tracking-widest text-xs">Scanning Log...</p>
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
        <p className="text-muted-foreground max-w-md mb-8">Unauthorized for Judge Panel.</p>
        <Button onClick={() => router.push("/login")} variant="outline" className="border-white/20 hover:text-white">
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

  const handleScoreChange = (key: string, val: string | number, max: number) => {
    let numericValue = typeof val === 'string' ? parseInt(val) : val;
    if (isNaN(numericValue)) numericValue = 0;
    if (numericValue > max) numericValue = max;
    if (numericValue < 0) numericValue = 0;
    
    setScores(prev => ({
      ...prev,
      [key]: numericValue
    }));
  };

  const handleSubmitScore = () => {
    if (!user || !selectedEntry) return;

    const scoreRef = doc(db, "entries", selectedEntry.id, "scoreSubmissions", user.uid);
    
    setDocumentNonBlocking(scoreRef, {
      judgeId: user.uid,
      entryId: selectedEntry.id,
      scores: {
        mastery: scores.mastery,
        innovation: scores.innovation,
        impact: scores.impact,
        compliance: scores.compliance
      },
      submissionDate: new Date().toISOString(),
      adminUploaded: false,
      comment: scores.comment
    }, { merge: true });

    if (judgeDocRef) {
      updateDocumentNonBlocking(judgeDocRef, {
        judgedEntries: arrayUnion(selectedEntry.id)
      });
    }

    toast({ title: "Evaluation Synchronized" });
    setSelectedEntry(null);
    setScores({ mastery: 15, innovation: 15, impact: 15, compliance: 5, comment: "" });
  };

  const isJudged = (entryId: string) => {
    return judgeRole?.judgedEntries?.includes(entryId);
  };

  const selectedEmbedUrl = selectedEntry ? getGoogleDriveEmbedUrl(selectedEntry.googleDriveVideoLink) : "";

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-80 flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
            Mission Log <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30">{entries?.length || 0}</Badge>
          </h2>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetPassword}
            disabled={isResettingPassword}
            className="w-full border-white/10 text-muted-foreground hover:text-white h-9 text-[10px] uppercase tracking-widest mb-4"
          >
            {isResettingPassword ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <KeyRound className="w-3 h-3 mr-2" />}
            Reset Password
          </Button>

          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2">
            {isEntriesLoading ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
            ) : entries?.map(entry => {
              const judged = isJudged(entry.id);
              return (
                <button
                  key={entry.id}
                  disabled={judged}
                  onClick={() => setSelectedEntry(entry)}
                  className={`p-4 rounded-lg text-left transition-all border ${
                    judged 
                      ? "bg-black/40 border-white/5 opacity-50 cursor-not-allowed" 
                      : selectedEntry?.id === entry.id 
                        ? "bg-accent/10 border-accent shadow-[0_0_10px_rgba(51,153,255,0.2)]" 
                        : "bg-white/5 border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className={`font-bold text-sm ${judged ? 'text-muted-foreground' : 'text-white'}`}>{entry.teamName}</div>
                    {judged && <Lock className="w-3 h-3 text-accent" />}
                    {entry.top10Published && !judged && <Presentation className="w-3 h-3 text-accent animate-pulse" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase">
                    {judged ? "LOGGED & SECURED" : (entry.projectMembers?.[0]?.school || "Academic Center")}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1">
          {selectedEntry ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-6">
                  <div>
                    <h1 className="text-4xl font-black text-white glow-accent italic">{selectedEntry.projectName || selectedEntry.teamName}</h1>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-accent font-semibold">{selectedEntry.challengeId}</p>
                      {selectedEntry.top10Published && <Badge className="bg-accent/20 text-accent border-accent/40">FINALIST ROUND</Badge>}
                    </div>
                  </div>
                  
                  <div className="aspect-video relative rounded-2xl overflow-hidden border border-white/10 bg-black">
                     <iframe width="100%" height="100%" src={selectedEmbedUrl} title="Pitch Video" allowFullScreen></iframe>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                      {selectedEntry.githubLink && (
                        <div className="glass-card p-6 rounded-xl border-accent/30">
                          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                            <Github className="w-4 h-4 text-accent" /> Source Code
                          </h3>
                          <Button asChild className="w-full bg-accent/10 text-accent hover:bg-accent hover:text-white border border-accent/20">
                            <a href={selectedEntry.githubLink} target="_blank" rel="noopener noreferrer">
                              Explore Repository <Github className="ml-2 w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      )}
                      {selectedEntry.pitchDeckLink && (
                        <div className="glass-card p-6 rounded-xl border-accent/50 bg-accent/5">
                          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                            <Presentation className="w-4 h-4 text-accent" /> Pitch Deck Available
                          </h3>
                          <Button asChild className="w-full bg-accent/20 text-accent hover:bg-accent hover:text-white border border-accent/30">
                            <a href={selectedEntry.pitchDeckLink} target="_blank" rel="noopener noreferrer">
                              Open Pitch Deck <Presentation className="ml-2 w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="glass-card p-6 rounded-xl">
                      <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-accent" /> Project Brief
                      </h3>
                      <p className="text-slate-300 text-sm leading-relaxed">{selectedEntry.projectDescription}</p>
                    </div>

                    <div className="glass-card p-6 rounded-xl">
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                        <Scale className="w-4 h-4 text-accent" /> Matrix Guide
                      </h3>
                      <div className="space-y-6">
                        {CRITERIA.map(crit => (
                          <div key={crit.key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[11px] font-bold text-white uppercase">{crit.label}</h4>
                              <Badge variant="outline" className="text-[9px] border-accent/30 text-accent">{crit.weight}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">{crit.desc}</p>
                            {crit.key === 'compliance' && (
                              <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                <h5 className="text-[9px] font-bold text-accent uppercase mb-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Mandatory Requirements
                                </h5>
                                <p className="text-[9px] text-slate-400 italic leading-snug">
                                  {COMPLIANCE_DETAILS}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-[450px] glass-card p-8 rounded-2xl border-accent/30 shadow-glow sticky top-24 h-fit">
                  <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Evaluation</h3>
                    <Scale className="w-5 h-5 text-accent/50" />
                  </div>
                  
                  <div className="space-y-10">
                    {CRITERIA.map(crit => (
                      <div key={crit.key} className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-bold text-white uppercase tracking-wider">{crit.label}</label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number"
                              className="w-16 h-8 text-center bg-black/40 border-white/10 text-accent font-mono font-bold"
                              value={(scores as any)[crit.key]}
                              onChange={(e) => handleScoreChange(crit.key, e.target.value, crit.max)}
                            />
                            <span className="text-[10px] text-muted-foreground font-bold uppercase">/ {crit.max}</span>
                          </div>
                        </div>
                        <Slider 
                          max={crit.max} 
                          step={1} 
                          value={[(scores as any)[crit.key]]} 
                          onValueChange={(val) => handleScoreChange(crit.key, val[0], crit.max)}
                        />
                      </div>
                    ))}

                    <div className="space-y-2 pt-4">
                      <label className="text-[11px] font-bold text-white uppercase tracking-wider">Confidential Comments</label>
                      <Textarea 
                        placeholder="Log observations for mission control..." 
                        className="bg-black/20 border-white/10 h-28 text-sm focus:border-accent transition-colors"
                        value={scores.comment}
                        onChange={e => setScores({...scores, comment: e.target.value})}
                      />
                    </div>

                    <Button className="w-full bg-accent hover:bg-accent/80 py-7 text-white font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(51,153,255,0.2)]" onClick={handleSubmitScore}>
                      <CheckCircle className="w-5 h-5 mr-3" /> Transmit Evaluation
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-40 glass-card rounded-2xl border-dashed border-2 border-white/10">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <AlertCircle className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 uppercase italic tracking-tighter">Awaiting Signal Selection</h2>
              <p className="text-muted-foreground max-w-xs text-xs uppercase tracking-widest leading-relaxed">Select a mission project from the mission log to begin decryption and evaluation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
