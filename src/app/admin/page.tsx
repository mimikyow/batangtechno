"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CHALLENGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Zap, ShieldAlert, Loader2, Trophy, UserPlus, KeyRound, UserMinus, BarChart3, Presentation, Save, Code, Medal, Edit2, Users, CheckCircle2, Star, RefreshCw, Power } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUser, useFirestore, useMemoFirebase, useCollection, useAuth } from "@/firebase";
import { doc, collection, getDocs, setDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const { user, isUserLoading } = userHook();
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

  const progWinnersQuery = useMemoFirebase(() => collection(db, "programming_winners"), [db]);
  const { data: progWinners } = useCollection(progWinnersQuery);

  const [isAdding, setIsAdding] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isAddingJudge, setIsAddingJudge] = useState(false);
  const [isAddingProgWinner, setIsAddingProgWinner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<any>(null);
  const [entryScores, setEntryScores] = useState<any[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(false);

  const [processingStatus, setProcessingStatus] = useState<"IDLE" | "CALCULATING" | "READY">("IDLE");
  const [rankedResults, setRankedResults] = useState<any[]>([]);
  const [publishingType, setPublishingType] = useState<"TOP10" | "TOP3">("TOP10");

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

  const [newProgWinner, setNewProgWinner] = useState({
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
          judgeName: judge?.name || "Unknown Judge"
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
      const batchSize = 500;
      for (const entry of (entries || [])) {
        const scoresRef = collection(db, "entries", entry.id, "scoreSubmissions");
        const snapshot = await getDocs(scoresRef);
        
        const batch = writeBatch(db);
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        // Also reset judge progress
        for (const judge of (judges || [])) {
          updateDocumentNonBlocking(doc(db, "roles_judge", judge.id), {
            judgedEntries: []
          });
        }
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
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 uppercase italic tracking-tighter">Access Denied</h1>
        <p className="text-muted-foreground max-w-md mb-8">Admin privileges required.</p>
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
      toast({ variant: "destructive", title: "Reset Failed", description: error.message });
    } finally {
      setIsResettingPassword(false);
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

      toast({ 
        title: "Judge Created", 
        description: `Credentials: ${newJudge.email} / ${automatedPassword}` 
      });
      
      setNewJudge({ name: "", username: "", email: "" });
      setIsAddingJudge(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Creation Failed", description: error.message });
    }
  };

  const handleAddProgWinner = () => {
    if (!newProgWinner.name || !newProgWinner.school || !newProgWinner.pictureUrl || !newProgWinner.schoolLogoUrl) {
      toast({ variant: "destructive", title: "Incomplete Fields", description: "All fields are required." });
      return;
    }

    addDocumentNonBlocking(collection(db, "programming_winners"), {
      ...newProgWinner,
      dateAdded: new Date().toISOString()
    });

    setIsAddingProgWinner(false);
    setNewProgWinner({
      name: "",
      school: "",
      pictureUrl: "",
      schoolLogoUrl: "",
      place: 1,
      category: "COLLEGE"
    });
    toast({ title: "Programming Winner Deployed" });
  };

  const handleDeleteProgWinner = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "programming_winners", id));
    toast({ title: "Winner Record Deleted" });
  };

  const handleProcessLeaderboard = async (type: "TOP10" | "TOP3") => {
    if (!entries || entries.length === 0) return;
    
    setPublishingType(type);
    setProcessingStatus("CALCULATING");
    
    try {
      const results = [];
      
      for (const entry of entries) {
        const scoresRef = collection(db, "entries", entry.id, "scoreSubmissions");
        const snapshot = await getDocs(scoresRef);
        
        let totalWeightedScore = 0;
        let submissionCount = 0;
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.scores) {
            const { mastery = 0, innovation = 0, impact = 0, compliance = 0 } = data.scores;
            const weightedSum = mastery + innovation + impact + compliance;
            totalWeightedScore += weightedSum;
            submissionCount++;
          }
        });
        
        results.push({
          id: entry.id,
          teamName: entry.teamName,
          avgScore: submissionCount > 0 ? (totalWeightedScore / submissionCount).toFixed(2) : "0.00",
          submissionCount,
          isFinalist: !!entry.top10Published
        });
      }
      
      const sorted = results.sort((a: any, b: any) => parseFloat(b.avgScore) - parseFloat(a.avgScore));
      setRankedResults(sorted);
      setProcessingStatus("READY");
    } catch (error) {
      toast({ variant: "destructive", title: "Process Failed", description: "Connection error." });
      setProcessingStatus("IDLE");
    }
  };

  const handleApplyRanks = async () => {
    try {
      const batch = writeBatch(db);
      
      if (publishingType === "TOP10") {
        rankedResults.slice(0, 10).forEach((res, index) => {
          const ref = doc(db, "entries", res.id);
          batch.update(ref, { 
            finalRank: index + 1,
            top10Published: true
          });
        });
        
        rankedResults.slice(10).forEach((res) => {
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
      }

      await batch.commit();
      setIsProcessing(false);
      setProcessingStatus("IDLE");
      toast({ title: publishingType === "TOP10" ? "Finalists Published" : "Winners Published" });
    } catch (error) {
      toast({ variant: "destructive", title: "Publication Failed" });
    }
  };

  const handleSavePitchLink = (entryId: string) => {
    if (!editingPitchLink) return;
    updateDocumentNonBlocking(doc(db, "entries", entryId), {
      pitchDeckLink: editingPitchLink.url
    });
    setEditingPitchLink(null);
    toast({ title: "Pitch Deck Updated" });
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

  const handleSaveEntry = () => {
    if (!newEntry.teamName || !newEntry.projectName || newEntry.projectMembers.length < 3) {
      toast({ variant: "destructive", title: "Validation Error", description: "Project Name, Team Name, and at least 3 members are required." });
      return;
    }

    if (newEntry.projectMembers.some(m => !m.name || !m.school)) {
      toast({ variant: "destructive", title: "Incomplete Fields", description: "All members must have a name and school." });
      return;
    }
    
    if (editingEntryId) {
      updateDocumentNonBlocking(doc(db, "entries", editingEntryId), {
        ...newEntry
      });
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
    setNewEntry({
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
  };

  const handleDeleteEntry = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "entries", id));
    toast({ title: "Entry Deleted" });
  };

  const isPlaceTaken = (cat: "HIGH_SCHOOL" | "COLLEGE", place: number) => {
    return progWinners?.some(w => w.category === cat && w.place === place);
  };

  const totalEntries = entries?.length || 0;

  function userHook() {
    return useUser();
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-bold text-white uppercase italic tracking-tighter">Command Center</h1>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetPassword}
              disabled={isResettingPassword}
              className="border-white/10 text-muted-foreground hover:text-white h-8 text-[10px] uppercase tracking-widest"
            >
              {isResettingPassword ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3 mr-2" />}
              Reset Password
            </Button>
          </div>
          <p className="text-muted-foreground uppercase text-xs tracking-widest">Admin Control Panel</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <Button 
            variant="outline" 
            onClick={handlePurgeAllScores}
            disabled={isPurging}
            className="border-destructive text-destructive hover:bg-destructive/10 uppercase text-xs font-bold tracking-widest"
          >
            {isPurging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Reset Evaluations
          </Button>

          <Dialog open={isAddingProgWinner} onOpenChange={setIsAddingProgWinner}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 hover:text-white uppercase text-xs font-bold tracking-widest">
                <Medal className="w-4 h-4 mr-2" /> Programming Elite
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase italic">Manage Programming Elite</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-4 border-b border-white/10 pb-6">
                  <h4 className="text-[10px] font-bold uppercase text-accent tracking-widest">Assign New Winner</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-muted-foreground">Name</label>
                      <Input value={newProgWinner.name} onChange={e => setNewProgWinner({...newProgWinner, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-muted-foreground">School</label>
                      <Input value={newProgWinner.school} onChange={e => setNewProgWinner({...newProgWinner, school: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-muted-foreground">Profile Picture URL</label>
                    <Input value={newProgWinner.pictureUrl} onChange={e => setNewProgWinner({...newProgWinner, pictureUrl: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-muted-foreground">School Logo URL</label>
                    <Input value={newProgWinner.schoolLogoUrl} onChange={e => setNewProgWinner({...newProgWinner, schoolLogoUrl: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-muted-foreground">Category</label>
                      <Select value={newProgWinner.category} onValueChange={(v: any) => setNewProgWinner({...newProgWinner, category: v})}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
                          <SelectItem value="COLLEGE">College</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-muted-foreground">Place</label>
                      <Select value={newProgWinner.place.toString()} onValueChange={(v) => setNewProgWinner({...newProgWinner, place: parseInt(v) as 1|2|3})}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1" disabled={isPlaceTaken(newProgWinner.category, 1)}>1st Place</SelectItem>
                          <SelectItem value="2" disabled={isPlaceTaken(newProgWinner.category, 2)}>2nd Place</SelectItem>
                          <SelectItem value="3" disabled={isPlaceTaken(newProgWinner.category, 3)}>3rd Place</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="w-full bg-accent uppercase text-xs font-bold" onClick={handleAddProgWinner}>Add Winner</Button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase text-accent tracking-widest">Active Records</h4>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {progWinners?.map(w => (
                        <div key={w.id} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5">
                          <div>
                            <div className="text-xs font-bold text-white">{w.name} <span className="text-[9px] text-accent ml-2">#{w.place} ({w.category === 'COLLEGE' ? 'College' : 'HS'})</span></div>
                            <div className="text-[9px] text-muted-foreground uppercase">{w.school}</div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteProgWinner(w.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddingJudge} onOpenChange={setIsAddingJudge}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/10 hover:text-white uppercase text-xs font-bold tracking-widest">
                <UserPlus className="w-4 h-4 mr-2" /> Register Judge
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase italic">Register Judge</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Full Name</label>
                  <Input placeholder="" value={newJudge.name} onChange={e => setNewJudge({...newJudge, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Username</label>
                  <Input placeholder="" value={newJudge.username} onChange={e => setNewJudge({...newJudge, username: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Email</label>
                  <Input type="email" placeholder="" value={newJudge.email} onChange={e => setNewJudge({...newJudge, email: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddingJudge(false)} className="uppercase text-xs hover:text-white">Cancel</Button>
                <Button className="bg-accent uppercase text-xs font-bold" onClick={handleCreateJudge}>Authorize Judge</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAdding} onOpenChange={(open) => {
            setIsAdding(open);
            if (!open) {
              setEditingEntryId(null);
              setNewEntry({
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
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/80 text-white uppercase text-xs font-bold tracking-widest">
                <Plus className="w-4 h-4 mr-2" /> New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-card border-border overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase italic">
                  {editingEntryId ? "Modify Entry" : "Deploy New Entry"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Project Name</label>
                    <Input placeholder="" value={newEntry.projectName} onChange={e => setNewEntry({...newEntry, projectName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Team Name</label>
                    <Input placeholder="" value={newEntry.teamName} onChange={e => setNewEntry({...newEntry, teamName: e.target.value})} />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Team Members (3-5)</label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setNewEntry({...newEntry, projectMembers: [...newEntry.projectMembers, { name: "", school: "", schoolLogoUrl: "" }]})}
                      disabled={newEntry.projectMembers.length >= 5}
                      className="h-7 text-[10px] uppercase tracking-tighter"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Member
                    </Button>
                  </div>
                  
                  {newEntry.projectMembers.map((member, idx) => (
                    <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3 relative">
                      {newEntry.projectMembers.length > 3 && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 h-6 w-6 text-destructive" 
                          onClick={() => setNewEntry({...newEntry, projectMembers: newEntry.projectMembers.filter((_, i) => i !== idx)})}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-9px uppercase text-muted-foreground">Name</label>
                          <Input className="h-8 text-sm" value={member.name} onChange={e => {
                            const m = [...newEntry.projectMembers];
                            m[idx].name = e.target.value;
                            setNewEntry({...newEntry, projectMembers: m});
                          }} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-9px uppercase text-muted-foreground">School</label>
                          <Input className="h-8 text-sm" value={member.school} onChange={e => {
                            const m = [...newEntry.projectMembers];
                            m[idx].school = e.target.value;
                            setNewEntry({...newEntry, projectMembers: m});
                          }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-9px uppercase text-muted-foreground">School Logo URL</label>
                        <Input className="h-8 text-sm" value={member.schoolLogoUrl} onChange={e => {
                          const m = [...newEntry.projectMembers];
                          m[idx].schoolLogoUrl = e.target.value;
                          setNewEntry({...newEntry, projectMembers: m});
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Challenge</label>
                  <Select value={newEntry.challengeId} onValueChange={(val: any) => setNewEntry({...newEntry, challengeId: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHALLENGES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Google Drive Video Link</label>
                  <Input placeholder="" value={newEntry.googleDriveVideoLink} onChange={e => setNewEntry({...newEntry, googleDriveVideoLink: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">GitHub Repository Link</label>
                  <Input placeholder="https://github.com/..." value={newEntry.githubLink} onChange={e => setNewEntry({...newEntry, githubLink: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Thumbnail Image URL</label>
                  <Input placeholder="" value={newEntry.thumbnailImageUrl} onChange={e => setNewEntry({...newEntry, thumbnailImageUrl: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Description</label>
                  <Textarea className="h-32" value={newEntry.projectDescription} onChange={e => setNewEntry({...newEntry, projectDescription: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => {
                  setIsAdding(false);
                  setEditingEntryId(null);
                }} className="uppercase text-xs hover:text-white">Cancel</Button>
                <Button className="bg-accent uppercase text-xs font-bold" onClick={handleSaveEntry}>
                  {editingEntryId ? "Update Entry" : "Save Entry"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isProcessing} onOpenChange={setIsProcessing}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/10 hover:text-white uppercase text-xs font-bold tracking-widest">
                <Zap className="w-4 h-4 mr-2" /> Leaderboard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase italic">Calculate Standings</DialogTitle>
              </DialogHeader>
              <div className="py-6">
                {processingStatus === "IDLE" && (
                  <div className="grid grid-cols-2 gap-4 text-center py-12">
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10 hover:border-accent/50 cursor-pointer transition-all" onClick={() => handleProcessLeaderboard("TOP10")}>
                      <Presentation className="w-12 h-12 text-accent/50 mx-auto mb-4" />
                      <h3 className="font-bold text-white mb-2">Publish Top 10</h3>
                      <p className="text-[10px] text-muted-foreground uppercase">Initial Mission Phase</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10 hover:border-yellow-500/50 cursor-pointer transition-all" onClick={() => handleProcessLeaderboard("TOP3")}>
                      <Trophy className="w-12 h-12 text-yellow-500/50 mx-auto mb-4" />
                      <h3 className="font-bold text-white mb-2">Publish Top 3</h3>
                      <p className="text-[10px] text-muted-foreground uppercase">Final Frontier Phase</p>
                    </div>
                  </div>
                )}
                {processingStatus === "CALCULATING" && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
                  </div>
                )}
                {processingStatus === "READY" && (
                  <div className="space-y-6">
                    <div className="glass-card rounded-lg overflow-hidden border-white/10">
                      <ScrollArea className="h-96">
                        <Table>
                          <TableHeader className="bg-white/5 sticky top-0 z-10">
                            <TableRow>
                              <TableHead className="w-20">Rank</TableHead>
                              <TableHead>Team</TableHead>
                              <TableHead className="text-right">Avg Score</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rankedResults.map((res, i) => {
                              const publishCount = publishingType === "TOP10" ? 10 : 3;
                              const isWillBePublished = i < publishCount;
                              
                              return (
                                <TableRow key={res.id} className={cn(isWillBePublished && "bg-accent/5")}>
                                  <TableCell className={cn("font-bold", isWillBePublished ? "text-accent" : "text-muted-foreground")}>
                                    #{i + 1}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{res.teamName}</span>
                                      <span className="text-[9px] text-muted-foreground uppercase">{res.submissionCount} Evaluations</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-bold">
                                    {res.avgScore}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {isWillBePublished ? (
                                      <Badge className={cn("text-[9px] uppercase", publishingType === "TOP10" ? "bg-accent" : "bg-yellow-500")}>
                                        {publishingType === "TOP10" ? "Promote" : "Winner"}
                                      </Badge>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground uppercase font-medium">Stationary</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                    <div className="flex gap-4">
                      <Button variant="ghost" onClick={() => setProcessingStatus("IDLE")} className="uppercase text-xs font-bold">Back</Button>
                      <Button onClick={handleApplyRanks} className="flex-1 bg-accent hover:bg-accent/80 uppercase font-bold text-sm h-12">
                        {publishingType === "TOP10" ? (
                          <><Star className="w-4 h-4 mr-2" /> Publish Top 10 Finalists</>
                        ) : (
                          <><Trophy className="w-4 h-4 mr-2" /> Publish Top 3 Winners</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden mb-12">
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <h2 className="font-bold uppercase text-xs tracking-widest text-accent">Hackathon Command Log</h2>
        </div>
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow>
              <TableHead>Project & Team</TableHead>
              <TableHead>Challenge</TableHead>
              <TableHead>Phase Access</TableHead>
              <TableHead className="text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries?.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{entry.projectName || "Unnamed Project"}</span>
                      {entry.top10Published && <Badge className="bg-accent/20 text-accent text-[8px] h-4">Finalist</Badge>}
                      {entry.top3Published && <Badge className="bg-yellow-500/20 text-yellow-500 text-[8px] h-4">Winner</Badge>}
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {entry.teamName} • {entry.projectMembers?.[0]?.school || "No School"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[9px] border-white/20">{entry.challengeId}</Badge>
                </TableCell>
                <TableCell>
                  {entry.top10Published ? (
                    <div className="flex items-center gap-2">
                      {editingPitchLink?.id === entry.id ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            className="h-7 text-[10px] w-48" 
                            placeholder="Pitch Deck URL" 
                            value={editingPitchLink.url}
                            onChange={e => setEditingPitchLink({...editingPitchLink, url: e.target.value})}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-accent" onClick={() => handleSavePitchLink(entry.id)}>
                            <Save className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-[9px] uppercase border-accent/30 text-accent hover:bg-accent/10"
                          onClick={() => setEditingPitchLink({id: entry.id, url: entry.pitchDeckLink || ""})}
                        >
                          <Presentation className="w-3 h-3 mr-1" /> 
                          {entry.pitchDeckLink ? "Update Pitch" : "Add Pitch Deck"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] text-muted-foreground uppercase italic">Pending Finalist Status</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditEntry(entry)} className="text-accent/60 hover:text-accent">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleViewScores(entry)} className="text-accent">
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteEntry(entry.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="glass-card rounded-xl overflow-hidden mb-12">
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <h2 className="font-bold uppercase text-xs tracking-widest text-accent flex items-center gap-2">
            <Users className="w-4 h-4" /> Judge Status Recon
          </h2>
          <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground uppercase">
            {judges?.length || 0} Operatives Active
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {judges?.map((judge) => {
            const completedCount = judge.judgedEntries?.length || 0;
            const progress = totalEntries > 0 ? (completedCount / totalEntries) * 100 : 0;
            const isFinished = completedCount >= totalEntries && totalEntries > 0;
            const isActive = judge.isActive !== false;

            return (
              <div key={judge.id} className={cn(
                "p-4 rounded-lg border transition-all space-y-4",
                isActive ? "bg-white/5 border-white/10" : "bg-destructive/5 border-destructive/20 opacity-70"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-sm">{judge.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">@{judge.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("h-8 w-8", isActive ? "text-accent" : "text-destructive")}
                      onClick={() => handleToggleJudgeStatus(judge.id, isActive)}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                    {isFinished ? (
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                    ) : (
                      <div className={cn("w-2 h-2 rounded-full animate-pulse", isActive ? "bg-accent" : "bg-destructive")} />
                    )}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] uppercase tracking-widest font-bold">
                    <span className="text-muted-foreground">Mission Progress</span>
                    <span className={isFinished ? "text-accent" : "text-white"}>
                      {completedCount} / {totalEntries} Logged
                    </span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>

                <div className="text-[9px] text-muted-foreground uppercase flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3 text-accent/50" />
                  {judge.email}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!viewingEntry} onOpenChange={() => setViewingEntry(null)}>
        <DialogContent className="max-w-4xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase italic">
              Score Breakdown: {viewingEntry?.projectName || viewingEntry?.teamName}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            {isLoadingScores ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            ) : entryScores.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground italic border-2 border-dashed border-white/5 rounded-xl">
                No evaluations recorded.
              </div>
            ) : (
              <ScrollArea className="h-[50vh]">
                <div className="space-y-6 pr-4">
                  {entryScores.map((score, idx) => (
                    <div key={idx} className="p-6 bg-white/5 rounded-xl border border-white/10 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="font-bold text-accent uppercase tracking-widest text-sm">{score.judgeName}</div>
                        <Badge variant="outline" className="text-[10px] border-white/20">
                          {new Date(score.submissionDate).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['mastery', 'innovation', 'impact', 'compliance'].map(key => (
                          <div key={key} className="p-3 bg-black/20 rounded-lg text-center">
                            <div className="text-[9px] uppercase text-muted-foreground mb-1">{key}</div>
                            <div className="text-xl font-bold text-white">{score.scores?.[key] || 0}</div>
                          </div>
                        ))}
                      </div>
                      {score.comment && (
                        <div className="p-4 bg-black/40 rounded-lg">
                          <p className="text-xs text-slate-300 italic">"{score.comment}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
