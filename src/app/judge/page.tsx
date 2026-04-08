
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Info, AlertCircle, ShieldAlert, Loader2, Scale, KeyRound, Lock, Presentation, Github, Filter, PowerOff, Sparkles, Award, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from "@/firebase";
import { doc, collection, arrayUnion, getDoc } from "firebase/firestore";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { getGoogleDriveEmbedUrl, cn } from "@/lib/utils";
import { sendPasswordResetEmail } from "firebase/auth";
import { CHALLENGES, STANDARD_CRITERIA, FINALS_CRITERIA } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function JudgePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const SPECIAL_JUDGE_EMAIL = "fcveroya@asklexph.com";
  const isSpecialJudge = user?.email?.toLowerCase() === SPECIAL_JUDGE_EMAIL;

  const judgeDocRef = useMemoFirebase(() => user ? doc(db, "roles_judge", user.uid) : null, [db, user]);
  const { data: judgeRole, isLoading: isJudgeChecking } = useDoc(judgeDocRef);

  const configRef = useMemoFirebase(() => doc(db, "settings", "judging"), [db]);
  const { data: appConfig } = useDoc(configRef);

  const entriesQuery = useMemoFirebase(() => collection(db, "entries"), [db]);
  const { data: entries, isLoading: isEntriesLoading } = useCollection(entriesQuery);

  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [isLoadingScores, setIsLoadingScores] = useState(false);

  const activePhase = appConfig?.phase || 'STANDARD';
  const isFinalsPhase = activePhase === 'FINALS';
  const activeCriteria = isFinalsPhase ? FINALS_CRITERIA : STANDARD_CRITERIA;

  // Split criteria for separate rendering
  const coreCriteria = activeCriteria.filter(c => !['uiux', 'sustainability'].includes(c.key));
  const specialCriteria = activeCriteria.filter(c => ['uiux', 'sustainability'].includes(c.key));

  const [scores, setScores] = useState<Record<string, string | number>>({
    comment: ""
  });

  const [nomination, setNomination] = useState<string>("");

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (judgeRole?.projectManagementNomination) {
      setNomination(judgeRole.projectManagementNomination);
    }
  }, [judgeRole]);

  useEffect(() => {
    async function loadExistingScores() {
      if (!selectedEntry || !user || !db) return;
      
      setIsLoadingScores(true);
      try {
        const scoreRef = doc(db, "entries", selectedEntry.id, "scoreSubmissions", user.uid);
        const snapshot = await getDoc(scoreRef);
        
        const initialScores: Record<string, any> = { comment: "" };
        activeCriteria.forEach(c => initialScores[c.key] = "");

        if (snapshot.exists()) {
          const data = snapshot.data();
          activeCriteria.forEach(c => {
            initialScores[c.key] = data.scores?.[c.key] ?? "";
          });
          initialScores.comment = data.comment ?? "";
        }
        setScores(initialScores);
      } catch (error) {
        console.error("Error loading scores:", error);
      } finally {
        setIsLoadingScores(false);
      }
    }

    loadExistingScores();
  }, [selectedEntry, user, db, activeCriteria]);

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
        <h1 className="text-2xl font-bold text-white mb-2 uppercase italic tracking-tighter">Access Denied</h1>
        <p className="text-muted-foreground max-w-md mb-8">Unauthorized for Judge Panel.</p>
        <Button onClick={() => router.push("/login")} variant="outline" className="border-white/20 hover:text-white">
          Go to Login
        </Button>
      </div>
    );
  }

  if (judgeRole.isActive === false) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <PowerOff className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 uppercase italic tracking-tighter">Session Suspended</h1>
        <p className="text-muted-foreground max-w-md mb-8">Your access has been temporarily deactivated by the Mission Command.</p>
        <Button onClick={() => router.push("/")} variant="outline" className="border-white/20 hover:text-white">
          Return to Public Board
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
    if (val === "") {
      setScores(prev => ({ ...prev, [key]: "" }));
      return;
    }

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

    const missing = activeCriteria.find(c => scores[c.key] === "");
    if (missing) {
      toast({ variant: "destructive", title: "Incomplete Mission", description: `Please provide a score for ${missing.label}.` });
      return;
    }

    const scoreRef = doc(db, "entries", selectedEntry.id, "scoreSubmissions", user.uid);
    
    const submissionData: Record<string, number> = {};
    activeCriteria.forEach(c => {
      submissionData[c.key] = Number(scores[c.key]);
    });

    setDocumentNonBlocking(scoreRef, {
      judgeId: user.uid,
      entryId: selectedEntry.id,
      scores: submissionData,
      submissionDate: new Date().toISOString(),
      adminUploaded: false,
      comment: scores.comment,
      phase: activePhase
    }, { merge: true });

    if (judgeDocRef) {
      updateDocumentNonBlocking(judgeDocRef, {
        judgedEntries: arrayUnion(selectedEntry.id)
      });
    }

    toast({ title: "Evaluation Synchronized" });
    setSelectedEntry(null);
  };

  const handleNominate = (entryId: string) => {
    if (!judgeDocRef) return;
    setNomination(entryId);
    updateDocumentNonBlocking(judgeDocRef, {
      projectManagementNomination: entryId
    });
    toast({ title: "Nomination Logged", description: "Ask Lex PH Academy Award winner updated." });
  };

  const isJudged = (entryId: string) => {
    return judgeRole?.judgedEntries?.includes(entryId);
  };

  const filteredEntries = (entries || [])
    .filter(e => {
      const matchesCategory = filter === "ALL" || e.challengeId === filter;
      if (isFinalsPhase) {
        return matchesCategory && e.top10Published;
      }
      return matchesCategory;
    })
    .sort((a, b) => {
      if (isFinalsPhase) {
        const rankA = a.finalRank || 999;
        const rankB = b.finalRank || 999;
        if (rankA !== rankB) return rankA - rankB;
      }
      const aJudged = isJudged(a.id);
      const bJudged = isJudged(b.id);
      if (aJudged === bJudged) return 0;
      return aJudged ? 1 : -1;
    });

  const finalists = (entries || []).filter(e => e.top10Published).sort((a, b) => (a.finalRank || 0) - (b.finalRank || 0));

  const selectedEmbedUrl = selectedEntry ? getGoogleDriveEmbedUrl(selectedEntry.googleDriveVideoLink) : "";

  return (
    <div className="container mx-auto px-4 py-8">
      {isSpecialJudge && isFinalsPhase && (
        <div className="mb-8 glass-card p-6 rounded-2xl border-yellow-500/30 bg-yellow-500/5 animate-in fade-in slide-in-from-top-4 duration-700">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500/20 p-2 rounded-xl border border-yellow-500/40">
                  <Award className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase italic tracking-tighter glow-accent">Ask Lex PH Academy Award</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Excellence in Project Management</p>
                </div>
              </div>
              
              <div className="flex-1 max-w-sm">
                <label className="text-[9px] uppercase text-yellow-500 font-bold mb-1 block tracking-[0.2em]">Select Mission Champion</label>
                <Select value={nomination} onValueChange={handleNominate}>
                  <SelectTrigger className="bg-black/40 border-yellow-500/20 h-10 text-[11px] uppercase font-bold text-white">
                    <SelectValue placeholder="Choose a Finalist" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {finalists.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.teamName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-80 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 italic">
              Mission Log <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30 text-xs">{filteredEntries.length}</Badge>
            </h2>
          </div>

          <div className="space-y-3 mb-4">
            <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
              <p className="text-[10px] text-accent font-black uppercase tracking-widest flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" /> 
                Phase: {isFinalsPhase ? "Final Frontier" : "Standard Selection"}
              </p>
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 h-10 text-[10px] uppercase font-bold tracking-widest text-white">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-accent" />
                  <SelectValue placeholder="Filter Categories" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="ALL">All Categories</SelectItem>
                {CHALLENGES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetPassword}
              disabled={isResettingPassword}
              className="w-full border-white/10 text-muted-foreground hover:text-white h-10 text-[10px] uppercase tracking-widest"
            >
              {isResettingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <KeyRound className="w-3.5 h-3.5 mr-2" />}
              Reset Password
            </Button>
          </div>

          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2">
            {isEntriesLoading ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-8 text-center glass-card rounded-lg border-dashed border-2 border-white/5">
                <p className="text-[10px] text-muted-foreground uppercase italic">No signals in range</p>
              </div>
            ) : filteredEntries.map(entry => {
              const judged = isJudged(entry.id);
              const isSelected = selectedEntry?.id === entry.id;
              const displayRank = entry.finalRank ? `#${entry.finalRank}` : null;
              
              return (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={cn(
                    "p-4 rounded-lg text-left transition-all border group",
                    isSelected 
                      ? "bg-accent/10 border-accent shadow-[0_0_10px_rgba(51,153,255,0.2)]" 
                      : judged
                        ? "bg-black/40 border-accent/20 hover:border-accent/40"
                        : "bg-white/5 border-white/10 hover:border-white/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className={cn(
                      "font-bold text-sm flex items-center gap-2",
                      isSelected ? "text-white" : judged ? "text-accent/80" : "text-white"
                    )}>
                      {isFinalsPhase && displayRank && <span className="text-accent/50 font-black">{displayRank}</span>}
                      {entry.teamName}
                    </div>
                    {judged && <Lock className="w-3.5 h-3.5 text-accent/50" />}
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">
                    {judged ? "LOGGED • CLICK TO EDIT" : (entry.projectMembers?.[0]?.school || "Academic Center")}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1">
          {selectedEntry ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-6">
                  {/* Judging Instructions - TOP */}
                  <Alert className="bg-accent/5 border-accent/20 p-6 rounded-2xl">
                    <BookOpen className="w-5 h-5 text-accent" />
                    <AlertTitle className="text-lg font-black uppercase tracking-widest text-white mb-2 italic">Judging Instructions</AlertTitle>
                    <AlertDescription className="space-y-3 text-slate-300 text-sm leading-relaxed">
                      <p>
                        The judging portal provides all materials for each entry, including the video presentation, project description, source code repository (for code quality review), and pitch deck.
                      </p>
                      <p>
                        On the right side, you will find the evaluation matrix where you can input your scores and comments. A scoring guide is also available for your reference.
                      </p>
                      <p className="font-bold text-accent">
                        You will also evaluate entries for two special awards: Best UI/UX Design Award and Best Tech for Sustainability Award. These are separate and will not affect the overall results.
                      </p>
                      {isSpecialJudge && (
                        <p className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-500 font-black uppercase text-xs italic">
                          Additionally, as the representative for Ask Lex PH, you will choose the winner for the Excellence in Project Management award from the Top 12 finalists using the dropdown at the top of the page.
                        </p>
                      )}
                      <p className="text-xs italic font-medium">
                        Please complete your evaluation within each team’s assigned timeslot to avoid delays in the program. Thank you!
                      </p>
                    </AlertDescription>
                  </Alert>

                  {/* Matrix Guide - TOP */}
                  <div className="glass-card p-6 rounded-2xl border-white/10">
                    <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2 uppercase tracking-[0.2em] italic">
                      <Scale className="w-5 h-5 text-accent" /> Matrix Guide ({isFinalsPhase ? 'FINAL FRONTIER' : 'STANDARD SELECTION'})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {activeCriteria.map(crit => (
                        <div key={crit.key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-white uppercase tracking-tight">{crit.label}</h4>
                            <Badge variant="outline" className="text-[10px] border-accent/30 text-accent font-black px-2 py-0.5">{crit.weight}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{crit.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pitch Deck Link */}
                  {selectedEntry.pitchDeckLink && (
                    <div className="glass-card p-4 rounded-xl border-accent/50 bg-accent/5">
                      <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2 uppercase italic tracking-tighter">
                        <Presentation className="w-4 h-4 text-accent" /> Pitch Deck Available
                      </h3>
                      <Button asChild className="w-full h-10 bg-accent/20 text-accent hover:bg-accent hover:text-white border border-accent/30 text-xs font-black uppercase tracking-widest">
                        <a href={selectedEntry.pitchDeckLink} target="_blank" rel="noopener noreferrer">
                          Open Pitch Deck <Presentation className="ml-2 w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  )}

                  <div>
                    <h1 className="text-3xl font-black text-white glow-accent italic tracking-tighter mb-1">{selectedEntry.projectName || selectedEntry.teamName}</h1>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-accent font-bold text-xs uppercase tracking-widest">{selectedEntry.challengeId}</p>
                      {selectedEntry.top10Published && <Badge className="bg-accent/20 text-accent border-accent/40 px-2 py-0.5 text-[9px] font-black italic">FINALIST ROUND</Badge>}
                    </div>
                  </div>
                  
                  <div className="aspect-video relative rounded-2xl overflow-hidden border border-white/10 bg-black shadow-xl">
                     <iframe width="100%" height="100%" src={selectedEmbedUrl} title="Pitch Video" allowFullScreen></iframe>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                      {selectedEntry.githubLink && (
                        <div className="glass-card p-6 rounded-2xl border-accent/30">
                          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2 uppercase italic">
                            <Github className="w-5 h-5 text-accent" /> Source Code
                          </h3>
                          <Button asChild className="w-full h-10 bg-accent/10 text-accent hover:bg-accent hover:text-white border border-accent/20 text-xs font-black uppercase tracking-widest">
                            <a href={selectedEntry.githubLink} target="_blank" rel="noopener noreferrer">
                              Explore Repository <Github className="ml-2 w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="glass-card p-6 rounded-2xl border-white/10">
                      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2 uppercase italic">
                        <Info className="w-5 h-5 text-accent" /> Project Brief
                      </h3>
                      <p className="text-slate-200 text-sm leading-relaxed">{selectedEntry.projectDescription}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-[400px] glass-card p-8 rounded-2xl border-accent/30 shadow-glow sticky top-20 h-fit">
                  <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">
                      {isJudged(selectedEntry.id) ? "Update Evaluation" : "New Evaluation"}
                    </h3>
                    <Scale className="w-5 h-5 text-accent/50" />
                  </div>
                  
                  {isLoadingScores ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Retrieving Logs...</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Core Mission Criteria Section */}
                      <div className="space-y-8">
                        {coreCriteria.map(crit => (
                          <div key={crit.key} className="space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-black text-white uppercase tracking-wider">{crit.label}</label>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number"
                                  placeholder="--"
                                  className="w-16 h-8 text-center bg-black/40 border-white/10 text-accent font-mono text-base font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={scores[crit.key]}
                                  onChange={(e) => handleScoreChange(crit.key, e.target.value, crit.max)}
                                />
                                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">/ {crit.max}</span>
                              </div>
                            </div>
                            <Slider 
                              max={crit.max} 
                              step={1} 
                              value={[Number(scores[crit.key]) || 0]} 
                              onValueChange={(val) => handleScoreChange(crit.key, val[0], crit.max)}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Special Awards Container */}
                      {specialCriteria.length > 0 && (
                        <div className="p-6 bg-accent/5 border border-accent/20 rounded-2xl space-y-8">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-accent" />
                            <h4 className="text-[12px] font-black uppercase text-accent tracking-[0.2em] italic">Special Awards Recon</h4>
                          </div>
                          {specialCriteria.map(crit => (
                            <div key={crit.key} className="space-y-3">
                              <div className="flex justify-between items-center">
                                <label className="text-sm font-black text-white uppercase tracking-wider">{crit.label}</label>
                                <div className="flex items-center gap-2">
                                  <Input 
                                    type="number"
                                    placeholder="--"
                                    className="w-16 h-8 text-center bg-black/60 border-accent/20 text-accent font-mono text-base font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={scores[crit.key]}
                                    onChange={(e) => handleScoreChange(crit.key, e.target.value, crit.max)}
                                  />
                                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">/ {crit.max}</span>
                                </div>
                              </div>
                              <Slider 
                                max={crit.max} 
                                step={1} 
                                value={[Number(scores[crit.key]) || 0]} 
                                onValueChange={(val) => handleScoreChange(crit.key, val[0], crit.max)}
                                className="[&_[role=slider]]:border-accent"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2 pt-4">
                        <label className="text-sm font-black text-white uppercase tracking-wider italic">Confidential Observations</label>
                        <Textarea 
                          placeholder="Log observations for mission control..." 
                          className="bg-black/20 border-white/10 h-24 text-sm focus:border-accent transition-colors p-3 leading-relaxed"
                          value={String(scores.comment)}
                          onChange={e => setScores({...scores, comment: e.target.value})}
                        />
                      </div>

                      <Button className="w-full bg-accent hover:bg-accent/80 py-6 text-white font-black uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(51,153,255,0.3)] transition-all transform hover:scale-[1.01]" onClick={handleSubmitScore}>
                        <CheckCircle className="w-5 h-5 mr-3" /> 
                        {isJudged(selectedEntry.id) ? "Update Transmission" : "Transmit Evaluation"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-40 glass-card rounded-2xl border-dashed border-2 border-white/10">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <AlertCircle className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">Awaiting Signal Selection</h2>
              <p className="text-muted-foreground max-w-sm text-[10px] uppercase tracking-[0.2em] leading-relaxed font-bold">Select a mission project from the sidebar to begin evaluation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
