
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CHALLENGES, STANDARD_CRITERIA, FINALS_CRITERIA } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Zap, ShieldAlert, Loader2, Trophy, UserPlus, KeyRound, BarChart3, Presentation, Save, Edit2, Users, Star, RefreshCw, Power, Settings2, ChevronUp, ChevronDown, Heart, Code, Rocket, Sparkles, Award } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUser, useFirestore, useMemoFirebase, useCollection, useAuth, useDoc } from "@/firebase";
import { doc, collection, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL?.toLowerCase();

  const entriesQuery = useMemoFirebase(() => collection(db, "entries"), [db]);
  const { data: entries } = useCollection(entriesQuery);

  const judgesQuery = useMemoFirebase(() => collection(db, "roles_judge"), [db]);
  const { data: judges } = useCollection(judgesQuery);

  const winnersQuery = useMemoFirebase(() => collection(db, "programming_winners"), [db]);
  const { data: winners } = useCollection(winnersQuery);

  const configRef = useMemoFirebase(() => doc(db, "settings", "judging"), [db]);
  const { data: appConfig } = useDoc(configRef);

  const activeCriteria = appConfig?.phase === 'FINALS' ? FINALS_CRITERIA : STANDARD_CRITERIA;

  const [isAdding, setIsAdding] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isAddingJudge, setIsAddingJudge] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<any>(null);
  const [entryScores, setEntryScores] = useState<any[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [processingStatus, setProcessingStatus] = useState<"IDLE" | "CALCULATING" | "READY">("IDLE");
  const [rankedResults, setRankedResults] = useState<any[]>([]);
  const [specialAwards, setSpecialAwards] = useState<any>({});
  const [publishingType, setPublishingType] = useState<"TOP12" | "TOP3">("TOP12");

  const [isAddingWinner, setIsAddingWinner] = useState(false);
  const [editingWinnerId, setEditingWinnerId] = useState<string | null>(null);

  const [newEntry, setNewEntry] = useState({
    projectName: "",
    teamName: "",
    projectDescription: "",
    challengeId: CHALLENGES[0],
    googleDriveVideoLink: "",
    githubLink: "",
    thumbnailImageUrl: "",
    projectMembers: [
      { name: "", school: "", schoolLogoUrl: "" },
      { name: "", school: "", schoolLogoUrl: "" },
      { name: "", school: "", schoolLogoUrl: "" }
    ]
  });

  const [newJudge, setNewJudge] = useState({
    name: "",
    username: "",
    email: ""
  });

  const [newWinner, setNewWinner] = useState({
    name: "",
    school: "",
    pictureUrl: "",
    schoolLogoUrl: "",
    place: 1 as 1 | 2 | 3,
    category: "COLLEGE" as "HIGH_SCHOOL" | "COLLEGE"
  });

  const [editingPitchLink, setEditingPitchLink] = useState<{id: string, url: string} | null>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  const handleSwitchPhase = (phase: 'STANDARD' | 'FINALS') => {
    setDocumentNonBlocking(doc(db, "settings", "judging"), { phase }, { merge: true });
    toast({ 
      title: `Judicial Phase Updated`, 
      description: `Active Matrix: ${phase === 'FINALS' ? 'Finals Round' : 'Standard Round'}` 
    });
  };

  const handleViewScores = async (entry: any) => {
    setViewingEntry(entry);
    setIsLoadingScores(true);
    try {
      const scoresRef = collection(db, "entries", entry.id, "scoreSubmissions");
      const snapshot = await getDocs(scoresRef);
      const scores: any[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const judgeId = data.judgeId || doc.id;
        const judge = (judges || []).find(j => j.id === judgeId);
        
        scores.push({
          ...data,
          judgeName: judge?.name || "Unknown Judge",
          isJudgeActive: judge?.isActive !== false
        });
      });
      
      setEntryScores(scores);
    } catch (error) {
      toast({ variant: "destructive", title: "Fetch Failed", description: "Could not load scores." });
    } finally {
      setIsLoadingScores(false);
    }
  };

  const handlePurgeAllScores = async () => {
    if (!confirm("CRITICAL ACTION: This will delete ALL evaluation scores across ALL entries. This cannot be undone. Proceed?")) return;
    
    setIsPurging(true);
    try {
      for (const entry of (entries || [])) {
        const scoresRef = collection(db, "entries", entry.id, "scoreSubmissions");
        const snapshot = await getDocs(scoresRef);
        
        const batch = writeBatch(db);
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      for (const judge of (judges || [])) {
        updateDocumentNonBlocking(doc(db, "roles_judge", judge.id), {
          judgedEntries: []
        });
      }
      
      toast({ title: "Mission Reset Complete", description: "All preliminary evaluations purged." });
    } catch (error) {
      toast({ variant: "destructive", title: "Purge Failed" });
    } finally {
      setIsPurging(false);
    }
  };

  const handleToggleJudgeStatus = (judgeId: string, currentStatus: boolean) => {
    updateDocumentNonBlocking(doc(db, "roles_judge", judgeId), {
      isActive: !currentStatus
    });
    toast({ title: currentStatus ? "Judge Deactivated" : "Judge Activated" });
  };

  const handleProcessLeaderboard = async (type: "TOP12" | "TOP3") => {
    if (!entries || entries.length === 0) return;
    
    setPublishingType(type);
    setProcessingStatus("CALCULATING");
    
    try {
      const results = [];
      const awardsCalc: Record<string, { team: string, score: number, id?: string }> = {
        problemFit: { team: "TBD", score: 0 },
        techExecution: { team: "TBD", score: 0 },
        innovationImpact: { team: "TBD", score: 0 },
        presentation: { team: "TBD", score: 0 },
        uiux: { team: "TBD", score: 0 },
        sustainability: { team: "TBD", score: 0 },
        projectManagement: { team: "Not Selected", score: 0 }
      };
      
      const targetEntries = type === "TOP3" ? entries.filter(e => e.top10Published) : entries;
      const coreKeys = type === "TOP3" 
        ? ["problemFit", "techExecution", "innovationImpact", "presentation"]
        : ["mastery", "innovation", "impact", "compliance"];

      for (const entry of targetEntries) {
        const scoresRef = collection(db, "entries", entry.id, "scoreSubmissions");
        const snapshot = await getDocs(scoresRef);
        
        let totalWeightedScore = 0;
        let submissionCount = 0;
        const criteriaSums: Record<string, number> = {};
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const judgeId = data.judgeId || doc.id;
          const judge = (judges || []).find(j => j.id === judgeId);

          const isPhaseValid = type === "TOP3" ? (data.scores && data.phase === "FINALS") : true;

          if (judge && judge.isActive !== false && isPhaseValid && data.scores) {
            let judgeSum = 0;
            coreKeys.forEach(k => {
              judgeSum += data.scores[k] || 0;
            });

            totalWeightedScore += judgeSum;
            submissionCount++;

            Object.keys(data.scores).forEach(k => {
              criteriaSums[k] = (criteriaSums[k] || 0) + data.scores[k];
            });
          }
        });
        
        const avgScore = submissionCount > 0 ? totalWeightedScore / submissionCount : 0;
        
        results.push({
          id: entry.id,
          teamName: entry.teamName,
          avgScore: avgScore.toFixed(2),
          uiuxScore: submissionCount > 0 ? (criteriaSums['uiux'] / submissionCount).toFixed(2) : "0.00",
          sustainabilityScore: submissionCount > 0 ? (criteriaSums['sustainability'] / submissionCount).toFixed(2) : "0.00",
          submissionCount,
          isFinalist: !!entry.top10Published
        });

        if (submissionCount > 0) {
          Object.keys(awardsCalc).forEach(key => {
            if (key === 'projectManagement') return;
            const avgCrit = criteriaSums[key] / submissionCount;
            if (avgCrit > awardsCalc[key].score) {
              awardsCalc[key] = { team: entry.teamName, score: avgCrit, id: entry.id };
            }
          });
        }
      }

      const specialJudge = judges?.find(j => j.email?.toLowerCase() === "fcveroya@asklexph.com");
      if (specialJudge && specialJudge.isActive !== false && specialJudge.projectManagementNomination) {
        const nominatedEntry = entries.find(e => e.id === specialJudge.projectManagementNomination);
        if (nominatedEntry) {
          awardsCalc.projectManagement = { team: nominatedEntry.teamName, score: 100, id: nominatedEntry.id };
        }
      }
      
      const sorted = results.sort((a: any, b: any) => parseFloat(b.avgScore) - parseFloat(a.avgScore));
      setRankedResults(sorted);
      setSpecialAwards(awardsCalc);
      setProcessingStatus("READY");
    } catch (error) {
      toast({ variant: "destructive", title: "Process Failed" });
      setProcessingStatus("IDLE");
    }
  };

  const handleApplyRanks = async () => {
    try {
      const batch = writeBatch(db);
      
      if (publishingType === "TOP12") {
        rankedResults.slice(0, 12).forEach((res, index) => {
          const ref = doc(db, "entries", res.id);
          batch.update(ref, { 
            finalRank: index + 1,
            top10Published: true
          });
        });
        
        rankedResults.slice(12).forEach((res) => {
          const ref = doc(db, "entries", res.id);
          batch.update(ref, { 
            finalRank: null,
            top10Published: false,
            top3Published: false
          });
        });
      } else {
        rankedResults.slice(0, 3).forEach((res, index) => {
          const ref = doc(db, "entries", res.id);
          batch.update(ref, { 
            finalRank: index + 1,
            top3Published: true
          });
        });

        entries?.forEach(e => {
          const ref = doc(db, "entries", e.id);
          batch.update(ref, {
            awardProblemFit: false,
            awardTechExecution: false,
            awardInnovationImpact: false,
            awardPresentation: false,
            awardUiux: false,
            awardSustainability: false,
            awardProjectManagement: false
          });
        });

        Object.keys(specialAwards).forEach(key => {
          const winnerId = specialAwards[key].id;
          if (winnerId) {
            const ref = doc(db, "entries", winnerId);
            const fieldMap: Record<string, string> = {
              problemFit: "awardProblemFit",
              techExecution: "awardTechExecution",
              innovationImpact: "awardInnovationImpact",
              presentation: "awardPresentation",
              uiux: "awardUiux",
              sustainability: "awardSustainability",
              projectManagement: "awardProjectManagement"
            };
            const field = fieldMap[key];
            if (field) {
              batch.update(ref, { [field]: true });
            }
          }
        });

        const peoplesChoiceWinner = entries?.find(e => e.isPeoplesChoice);
        if (peoplesChoiceWinner) {
          const ref = doc(db, "entries", peoplesChoiceWinner.id);
          batch.update(ref, { isPeoplesChoice: true });
        }
      }

      await batch.commit();
      setIsProcessing(false);
      setProcessingStatus("IDLE");
      toast({ title: publishingType === "TOP12" ? "Finalists Published" : "Winners & Special Awards Published" });
    } catch (error) {
      toast({ variant: "destructive", title: "Publication Failed" });
    }
  };

  const handleSetPeoplesChoice = (entryId: string) => {
    if (entryId === "NONE") {
      entries?.forEach(e => {
        if (e.isPeoplesChoice) {
          updateDocumentNonBlocking(doc(db, "entries", e.id), { isPeoplesChoice: false });
        }
      });
      toast({ title: "People's Choice Cleared" });
      return;
    }

    entries?.forEach(e => {
      if (e.isPeoplesChoice) {
        updateDocumentNonBlocking(doc(db, "entries", e.id), { isPeoplesChoice: false });
      }
    });

    if (entryId) {
      updateDocumentNonBlocking(doc(db, "entries", entryId), { isPeoplesChoice: true });
      toast({ title: "People's Choice Updated" });
    }
  };

  const handleCreateJudge = async () => {
    if (!newJudge.name || !newJudge.username || !newJudge.email) {
      toast({ variant: "destructive", title: "Error", description: "All fields are required." });
      return;
    }

    const automatedPassword = `BT_${newJudge.name.replace(/\s+/g, '')}`;
    
    try {
      const secondaryApp = !getApps().find(app => app.name === 'secondary') 
        ? initializeApp(firebaseConfig, 'secondary')
        : getApp('secondary');
      
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newJudge.email, automatedPassword);
      const judgeUid = userCredential.user.uid;

      await setDoc(doc(db, "roles_judge", judgeUid), {
        id: judgeUid,
        externalAuthId: judgeUid,
        email: newJudge.email,
        username: newJudge.username,
        name: newJudge.name,
        role: "judge",
        isActive: true,
        judgedEntries: []
      });

      toast({ title: "Judge Created", description: `Creds: ${newJudge.email} / ${automatedPassword}` });
      setNewJudge({ name: "", username: "", email: "" });
      setIsAddingJudge(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Creation Failed", description: error.message });
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({ title: "Reset Link Sent" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Reset Failed", description: error.message });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSaveEntry = () => {
    if (!newEntry.teamName || !newEntry.projectName) {
      toast({ variant: "destructive", title: "Validation Error" });
      return;
    }
    
    if (editingEntryId) {
      updateDocumentNonBlocking(doc(db, "entries", editingEntryId), { ...newEntry });
      toast({ title: "Entry Updated" });
    } else {
      addDocumentNonBlocking(collection(db, "entries"), {
        ...newEntry,
        submissionDate: new Date().toISOString(),
        adminApproved: true,
        top10Published: false,
        top3Published: false
      });
      toast({ title: "Entry Deployed" });
    }

    setIsAdding(false);
    setEditingEntryId(null);
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntryId(entry.id);
    setNewEntry({
      projectName: entry.projectName || "",
      teamName: entry.teamName || "",
      projectDescription: entry.projectDescription || "",
      challengeId: entry.challengeId || CHALLENGES[0],
      googleDriveVideoLink: entry.googleDriveVideoLink || "",
      githubLink: entry.githubLink || "",
      thumbnailImageUrl: entry.thumbnailImageUrl || "",
      projectMembers: entry.projectMembers || [
        { name: "", school: "", schoolLogoUrl: "" },
        { name: "", school: "", schoolLogoUrl: "" },
        { name: "", school: "", schoolLogoUrl: "" }
      ]
    });
    setIsAdding(true);
  };

  const handleDeleteEntry = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "entries", id));
    toast({ title: "Entry Deleted" });
  };

  const handleSaveWinner = () => {
    if (!newWinner.name || !newWinner.school) {
      toast({ variant: "destructive", title: "Validation Error" });
      return;
    }

    if (editingWinnerId) {
      updateDocumentNonBlocking(doc(db, "programming_winners", editingWinnerId), { ...newWinner });
      toast({ title: "Winner Updated" });
    } else {
      addDocumentNonBlocking(collection(db, "programming_winners"), { ...newWinner });
      toast({ title: "Winner Registered" });
    }

    setIsAddingWinner(false);
    setEditingWinnerId(null);
    setNewWinner({ name: "", school: "", pictureUrl: "", schoolLogoUrl: "", place: 1, category: "COLLEGE" });
  };

  const handleEditWinner = (winner: any) => {
    setEditingWinnerId(winner.id);
    setNewWinner({
      name: winner.name,
      school: winner.school,
      pictureUrl: winner.pictureUrl,
      schoolLogoUrl: winner.schoolLogoUrl,
      place: winner.place,
      category: winner.category
    });
    setIsAddingWinner(true);
  };

  const handleDeleteWinner = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "programming_winners", id));
    toast({ title: "Winner Deleted" });
  };

  const handleSavePitchLink = (entryId: string) => {
    if (!editingPitchLink) return;
    updateDocumentNonBlocking(doc(db, "entries", entryId), {
      pitchDeckLink: editingPitchLink.url
    });
    setEditingPitchLink(null);
    toast({ title: "Pitch Deck Updated" });
  };

  const handleMoveRank = (entryId: string, direction: 'UP' | 'DOWN') => {
    if (!filteredEntries) return;
    const currentIndex = filteredEntries.findIndex(e => e.id === entryId);
    
    if (direction === 'UP' && currentIndex > 0) {
      const entryA = filteredEntries[currentIndex];
      const entryB = filteredEntries[currentIndex - 1];
      const rankA = entryA.finalRank || (currentIndex + 1);
      const rankB = entryB.finalRank || currentIndex;
      
      updateDocumentNonBlocking(doc(db, "entries", entryA.id), { finalRank: rankB });
      updateDocumentNonBlocking(doc(db, "entries", entryB.id), { finalRank: rankA });
      toast({ title: "Sequence Updated" });
    } else if (direction === 'DOWN' && currentIndex < filteredEntries.length - 1) {
      const entryA = filteredEntries[currentIndex];
      const entryB = filteredEntries[currentIndex + 1];
      const rankA = entryA.finalRank || (currentIndex + 1);
      const rankB = entryB.finalRank || (currentIndex + 2);
      
      updateDocumentNonBlocking(doc(db, "entries", entryA.id), { finalRank: rankB });
      updateDocumentNonBlocking(doc(db, "entries", entryB.id), { finalRank: rankA });
      toast({ title: "Sequence Updated" });
    }
  };

  if (isUserLoading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="text-muted-foreground uppercase tracking-widest text-xs">Accessing Command Center...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <ShieldAlert className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold uppercase">Unauthorized Access</h1>
        <Button onClick={() => router.push("/login")} variant="outline" className="mt-4">Login as Admin</Button>
      </div>
    );
  }

  const totalEntries = entries?.length || 0;
  const filteredEntries = entries?.filter(entry => {
    if (appConfig?.phase === 'FINALS') return entry.top10Published;
    return true;
  }).sort((a, b) => {
    if (appConfig?.phase === 'FINALS') {
      return (a.finalRank || 999) - (b.finalRank || 999);
    }
    return 0;
  });

  const peoplesChoiceWinner = entries?.find(e => e.isPeoplesChoice);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-bold text-white uppercase italic tracking-tighter">Command Center</h1>
            <Button 
              variant="outline" size="sm" onClick={handleResetPassword} disabled={isResettingPassword}
              className="border-white/10 text-muted-foreground hover:text-white h-8 text-[10px] uppercase tracking-widest"
            >
              {isResettingPassword ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3 mr-2" />}
              Reset Password
            </Button>
          </div>
          <p className="text-muted-foreground uppercase text-xs tracking-widest">Global Hackathon Controller</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-lg">
            <Badge variant="outline" className={cn("uppercase text-[10px] tracking-widest border-none px-3", appConfig?.phase === 'FINALS' ? "text-accent" : "text-white")}>
              {appConfig?.phase === 'FINALS' ? "Final Frontier Active" : "Standard Selection Active"}
            </Badge>
            <Button size="sm" variant={appConfig?.phase === 'FINALS' ? "outline" : "default"} onClick={() => handleSwitchPhase('STANDARD')} className="h-7 text-[9px] uppercase font-black">Standard</Button>
            <Button size="sm" variant={appConfig?.phase === 'FINALS' ? "default" : "outline"} onClick={() => handleSwitchPhase('FINALS')} className="h-7 text-[9px] uppercase font-black bg-accent">Finals</Button>
          </div>

          <Button variant="outline" onClick={handlePurgeAllScores} disabled={isPurging} className="border-destructive text-destructive hover:bg-destructive/10 uppercase text-xs font-bold tracking-widest">
            {isPurging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Purge All Scores
          </Button>

          <Dialog open={isAddingJudge} onOpenChange={setIsAddingJudge}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/10 uppercase text-xs font-bold tracking-widest">
                <UserPlus className="w-4 h-4 mr-2" /> Register Judge
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="uppercase italic">Authorize Judge</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><label className="text-[10px] uppercase text-accent tracking-widest">Full Name</label><Input value={newJudge.name} onChange={e => setNewJudge({...newJudge, name: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-[10px] uppercase text-accent tracking-widest">Username</label><Input value={newJudge.username} onChange={e => setNewJudge({...newJudge, username: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-[10px] uppercase text-accent tracking-widest">Email</label><Input value={newJudge.email} onChange={e => setNewJudge({...newJudge, email: e.target.value})} /></div>
              </div>
              <DialogFooter><Button className="bg-accent uppercase text-xs font-bold" onClick={handleCreateJudge}>Confirm Enrollment</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="hackathon" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 mb-8">
          <TabsTrigger value="hackathon" className="data-[state=active]:bg-accent data-[state=active]:text-white uppercase text-[10px] font-black tracking-widest px-8">
            <Rocket className="w-4 h-4 mr-2" /> Hackathon Hub
          </TabsTrigger>
          <TabsTrigger value="programming" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white uppercase text-[10px] font-black tracking-widest px-8">
            <Code className="w-4 h-4 mr-2" /> Programming Elite
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hackathon">
          <div className="flex justify-end gap-4 mb-8">
            <Dialog open={isProcessing} onOpenChange={setIsProcessing}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-accent text-accent hover:bg-accent/10 uppercase text-xs font-bold tracking-widest"><Zap className="w-4 h-4 mr-2" /> Leaderboard</Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl bg-card border-border">
                <DialogHeader><DialogTitle className="uppercase italic">Mission Standings</DialogTitle></DialogHeader>
                <div className="py-6">
                  {processingStatus === "IDLE" && (
                    <div className="grid grid-cols-2 gap-4 text-center py-12">
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10 hover:border-accent cursor-pointer" onClick={() => handleProcessLeaderboard("TOP12")}>
                        <Trophy className="w-12 h-12 text-accent/50 mx-auto mb-4" />
                        <h3 className="font-bold text-white uppercase text-xs">Publish Top 12</h3>
                      </div>
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10 hover:border-yellow-500 cursor-pointer" onClick={() => handleProcessLeaderboard("TOP3")}>
                        <Star className="w-12 h-12 text-yellow-500/50 mx-auto mb-4" />
                        <h3 className="font-bold text-white uppercase text-xs">Publish Top 3</h3>
                      </div>
                    </div>
                  )}
                  {processingStatus === "CALCULATING" && <div className="text-center py-12"><Loader2 className="w-12 h-12 text-accent animate-spin mx-auto" /></div>}
                  {processingStatus === "READY" && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-accent" />
                        <h4 className="text-[11px] font-black uppercase text-accent tracking-[0.2em] italic">Special Award Recon</h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                         <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg text-center">
                            <p className="text-[9px] uppercase text-accent font-bold mb-1">Problem Solver</p>
                            <p className="text-[10px] text-white font-black truncate">{specialAwards.problemFit?.team}</p>
                         </div>
                         <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg text-center">
                            <p className="text-[9px] uppercase text-accent font-bold mb-1">Tech Execution</p>
                            <p className="text-[10px] text-white font-black truncate">{specialAwards.techExecution?.team}</p>
                         </div>
                         <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg text-center">
                            <p className="text-[9px] uppercase text-accent font-bold mb-1">Impactful Innovation</p>
                            <p className="text-[10px] text-white font-black truncate">{specialAwards.innovationImpact?.team}</p>
                         </div>
                         <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg text-center">
                            <p className="text-[9px] uppercase text-accent font-bold mb-1">Best Pitch</p>
                            <p className="text-[10px] text-white font-black truncate">{specialAwards.presentation?.team}</p>
                         </div>
                         <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-center">
                            <p className="text-[9px] uppercase text-yellow-500 font-bold mb-1">Best UI/UX</p>
                            <p className="text-[10px] text-white font-black truncate">{specialAwards.uiux?.team}</p>
                         </div>
                         <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-center">
                            <p className="text-[9px] uppercase text-yellow-500 font-bold mb-1">Sustainability</p>
                            <p className="text-[10px] text-white font-black truncate">{specialAwards.sustainability?.team}</p>
                         </div>
                         <div className="p-4 bg-yellow-500/10 border border-yellow-500/40 rounded-lg text-center col-span-2">
                            <p className="text-[9px] uppercase text-yellow-500 font-bold mb-1 flex items-center justify-center gap-2"><Award className="w-3 h-3" /> Ask Lex PH Academy Award</p>
                            <p className="text-[11px] text-white font-black truncate">{specialAwards.projectManagement?.team}</p>
                         </div>
                      </div>
                      <ScrollArea className="h-72">
                        <Table>
                          <TableHeader className="bg-white/5 sticky top-0">
                            <TableRow>
                              <TableHead>Rank</TableHead>
                              <TableHead>Team</TableHead>
                              <TableHead className="text-right">Avg Core</TableHead>
                              {appConfig?.phase === "FINALS" && (
                                <>
                                  <TableHead className="text-right">UI/UX Avg</TableHead>
                                  <TableHead className="text-right">Sustain Avg</TableHead>
                                </>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rankedResults.map((res, i) => (
                              <TableRow key={res.id} className={cn(i < (publishingType === "TOP12" ? 12 : 3) && "bg-accent/5")}>
                                <TableCell className="font-bold">#{i + 1}</TableCell>
                                <TableCell className="font-medium text-xs">{res.teamName}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{res.avgScore}</TableCell>
                                {appConfig?.phase === "FINALS" && (
                                  <>
                                    <TableCell className="text-right font-mono text-xs text-yellow-500">{res.uiuxScore}</TableCell>
                                    <TableCell className="text-right font-mono text-xs text-green-500">{res.sustainabilityScore}</TableCell>
                                  </>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                      <div className="flex gap-4">
                        <Button variant="ghost" onClick={() => setProcessingStatus("IDLE")} className="uppercase text-xs font-bold">Back</Button>
                        <Button onClick={handleApplyRanks} className="flex-1 bg-accent uppercase font-bold text-xs">
                          {publishingType === "TOP12" ? "Publish Top 12 Finalists" : "Publish Winners & Special Awards"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAdding} onOpenChange={setIsAdding}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/80 text-white uppercase text-xs font-bold tracking-widest"><Plus className="w-4 h-4 mr-2" /> New Entry</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-card border-border">
                <DialogHeader><DialogTitle className="uppercase italic">Deploy Mission Entry</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-[10px] uppercase text-accent tracking-widest">Project Name</label><Input value={newEntry.projectName} onChange={e => setNewEntry({...newEntry, projectName: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] uppercase text-accent tracking-widest">Team Name</label><Input value={newEntry.teamName} onChange={e => setNewEntry({...newEntry, teamName: e.target.value})} /></div>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] uppercase text-accent tracking-widest">Challenge</label><Select value={newEntry.challengeId} onValueChange={(val: any) => setNewEntry({...newEntry, challengeId: val})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CHALLENGES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><label className="text-[10px] uppercase text-accent tracking-widest">Description</label><Textarea value={newEntry.projectDescription} onChange={e => setNewEntry({...newEntry, projectDescription: e.target.value})} /></div>
                </div>
                <DialogFooter><Button className="bg-accent uppercase text-xs font-bold" onClick={handleSaveEntry}>Save Mission Data</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h2 className="font-bold uppercase text-xs tracking-widest text-accent flex items-center gap-2"><Settings2 className="w-4 h-4" /> Hackathon Command Log</h2>
              </div>
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow>
                    {appConfig?.phase === 'FINALS' && <TableHead className="w-16">Seq</TableHead>}
                    <TableHead>Project & Team</TableHead>
                    <TableHead>Phase Access</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries?.map((entry, idx) => (
                    <TableRow key={entry.id}>
                      {appConfig?.phase === 'FINALS' && (
                        <TableCell>
                          <div className="flex flex-col items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-accent/50 disabled:opacity-20" disabled={idx === 0} onClick={() => handleMoveRank(entry.id, 'UP')}><ChevronUp className="w-4 h-4" /></Button>
                            <span className="text-[10px] font-bold text-white">{entry.finalRank || idx + 1}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-accent/50 disabled:opacity-20" disabled={idx === filteredEntries.length - 1} onClick={() => handleMoveRank(entry.id, 'DOWN')}><ChevronDown className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{entry.projectName}</span>
                            {entry.isPeoplesChoice && <Heart className="w-3 h-3 text-red-500 fill-red-500" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground uppercase">{entry.teamName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.top10Published ? (
                          <div className="flex items-center gap-2">
                            {editingPitchLink?.id === entry.id ? (
                              <div className="flex items-center gap-2">
                                <Input className="h-7 text-[10px] w-32" value={editingPitchLink.url} onChange={e => setEditingPitchLink({...editingPitchLink, url: e.target.value})} />
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-accent" onClick={() => handleSavePitchLink(entry.id)}><Save className="w-3.5 h-3.5" /></Button>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" className="h-7 text-[9px] uppercase border-accent/30 text-accent" onClick={() => setEditingPitchLink({id: entry.id, url: entry.pitchDeckLink || ""})}>
                                <Presentation className="w-3 h-3 mr-1" /> {entry.pitchDeckLink ? "Update Pitch" : "Add Pitch"}
                              </Button>
                            )}
                          </div>
                        ) : <Badge variant="ghost" className="text-[9px] uppercase opacity-40">Awaiting Finalist Status</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleViewScores(entry)} className="text-accent h-8 w-8"><BarChart3 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditEntry(entry)} className="text-accent/60 h-8 w-8"><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteEntry(entry.id)} className="text-destructive h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-8">
               <div className="glass-card rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <h2 className="font-bold uppercase text-xs tracking-widest text-accent">People's Choice</h2>
                  </div>
                  <div className="p-6 space-y-4">
                     <Select value={peoplesChoiceWinner?.id || "NONE"} onValueChange={handleSetPeoplesChoice}>
                        <SelectTrigger className="bg-black/20 border-white/10 text-xs font-bold uppercase"><SelectValue placeholder="Select Winner" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None / Reset</SelectItem>
                          {entries?.map(e => <SelectItem key={e.id} value={e.id}>{e.teamName}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <h2 className="font-bold uppercase text-xs tracking-widest text-accent">Judge Status</h2>
                </div>
                <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                  {judges?.map((judge) => {
                    const completedCount = judge.judgedEntries?.length || 0;
                    const progress = totalEntries > 0 ? (completedCount / totalEntries) * 100 : 0;
                    const isActive = judge.isActive !== false;
                    return (
                      <div key={judge.id} className={cn("p-4 rounded-lg border", isActive ? "bg-white/5 border-white/10" : "bg-destructive/5 border-destructive/20 opacity-60")}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex flex-col"><span className="font-bold text-white text-xs">{judge.name}</span><span className="text-[9px] text-muted-foreground">@{judge.username}</span></div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" onClick={() => handleToggleJudgeStatus(judge.id, isActive)}><Power className="w-3.5 h-3.5" /></Button>
                        </div>
                        <Progress value={progress} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="programming">
          <div className="flex justify-end mb-8">
            <Dialog open={isAddingWinner} onOpenChange={setIsAddingWinner}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white uppercase text-xs font-bold tracking-widest">
                  <Plus className="w-4 h-4 mr-2" /> New Programming Champion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-card border-border">
                <DialogHeader><DialogTitle className="uppercase italic">Enroll Programming Elite</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-[10px] uppercase text-purple-400 tracking-widest">Champion Name</label><Input value={newWinner.name} onChange={e => setNewWinner({...newWinner, name: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] uppercase text-purple-400 tracking-widest">School</label><Input value={newWinner.school} onChange={e => setNewWinner({...newWinner, school: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase text-purple-400 tracking-widest">Division</label>
                      <Select value={newWinner.category} onValueChange={(val: any) => setNewWinner({...newWinner, category: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COLLEGE">COLLEGE</SelectItem>
                          <SelectItem value="HIGH_SCHOOL">HIGH SCHOOL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase text-purple-400 tracking-widest">Rank</label>
                      <Select value={String(newWinner.place)} onValueChange={(val: any) => setNewWinner({...newWinner, place: Number(val) as 1 | 2 | 3})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1st Place (Champion)</SelectItem>
                          <SelectItem value="2">2nd Place</SelectItem>
                          <SelectItem value="3">3rd Place</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] uppercase text-purple-400 tracking-widest">Picture URL (Drive Link)</label><Input value={newWinner.pictureUrl} onChange={e => setNewWinner({...newWinner, pictureUrl: e.target.value})} /></div>
                  <div className="space-y-2"><label className="text-[10px] uppercase text-purple-400 tracking-widest">School Logo URL (Drive Link)</label><Input value={newWinner.schoolLogoUrl} onChange={e => setNewWinner({...newWinner, schoolLogoUrl: e.target.value})} /></div>
                </div>
                <DialogFooter><Button className="bg-purple-600 uppercase text-xs font-bold" onClick={handleSaveWinner}>Archive Champion</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <h2 className="font-bold uppercase text-xs tracking-widest text-purple-400 flex items-center gap-2"><Code className="w-4 h-4" /> Programming Hall of Fame</h2>
            </div>
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow>
                  <TableHead>Division</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {winners?.sort((a, b) => a.category.localeCompare(b.category) || a.place - b.place).map((winner) => (
                  <TableRow key={winner.id}>
                    <TableCell><Badge variant="outline" className="text-[9px] uppercase border-purple-500/30 text-purple-400">{winner.category.replace('_', ' ')}</Badge></TableCell>
                    <TableCell><span className="font-black text-white">#{winner.place}</span></TableCell>
                    <TableCell><span className="font-bold text-white text-sm">{winner.name}</span></TableCell>
                    <TableCell><span className="text-[10px] text-muted-foreground uppercase">{winner.school}</span></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditWinner(winner)} className="text-purple-400/60 h-8 w-8"><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteWinner(winner.id)} className="text-destructive h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewingEntry} onOpenChange={() => setViewingEntry(null)}>
        <DialogContent className="max-w-4xl bg-card border-border">
          <DialogHeader><DialogTitle className="uppercase italic">Score Breakdown: {viewingEntry?.projectName}</DialogTitle></DialogHeader>
          <div className="py-6">
            {isLoadingScores ? <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div> : (
              <ScrollArea className="h-[50vh]">
                <div className="space-y-6 pr-4">
                  {entryScores.filter(score => score.isJudgeActive).map((score, idx) => (
                    <div key={idx} className="p-6 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                        <div className="font-bold text-accent uppercase tracking-widest text-xs">{score.judgeName}</div>
                        <Badge variant="outline" className="text-[9px] border-white/20 uppercase">{score.phase || "STANDARD"}</Badge>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black uppercase text-muted-foreground mb-3 tracking-widest">Core Mission Criteria</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {activeCriteria.filter(c => !['uiux', 'sustainability'].includes(c.key)).map(crit => (
                              <div key={crit.key} className="p-3 bg-black/20 rounded-lg text-center">
                                <div className="text-[8px] uppercase text-muted-foreground mb-1">{crit.label}</div>
                                <div className="text-lg font-bold text-white">{score.scores?.[crit.key] ?? 0}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {(score.phase === 'FINALS' || appConfig?.phase === 'FINALS') && (
                          <div className="pt-4 border-t border-white/5">
                            <p className="text-[9px] font-black uppercase text-yellow-500 mb-3 tracking-widest flex items-center gap-2"><Sparkles className="w-3 h-3" /> Special Award Recon</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg text-center">
                                <div className="text-[8px] uppercase text-yellow-500/70 mb-1">UI/UX Design</div>
                                <div className="text-lg font-bold text-white">{score.scores?.uiux ?? 0}</div>
                              </div>
                              <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-lg text-center">
                                <div className="text-[8px] uppercase text-green-500/70 mb-1">Sustainability</div>
                                <div className="text-lg font-bold text-white">{score.scores?.sustainability ?? 0}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {score.comment && <p className="text-[10px] text-slate-400 italic mt-4 border-t border-white/5 pt-2">"{score.comment}"</p>}
                    </div>
                  ))}
                  {entryScores.filter(score => score.isJudgeActive).length === 0 && (
                    <div className="py-20 text-center uppercase text-muted-foreground text-[10px] tracking-widest">
                      No active judge evaluations found for this project.
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
