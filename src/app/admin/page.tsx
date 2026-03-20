"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CHALLENGES, MOCK_ENTRIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, UploadCloud, Save, Users, Video, Image as ImageIcon, ShieldAlert, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const adminDocRef = useMemoFirebase(() => user ? doc(db, "roles_admin", user.uid) : null, [db, user]);
  const { data: adminRole, isLoading: isAdminChecking } = useDoc(adminDocRef);

  const [entries, setEntries] = useState(MOCK_ENTRIES);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newEntry, setNewEntry] = useState({
    teamName: "",
    school: "",
    description: "",
    challenge: CHALLENGES[0],
    videoLink: "",
    thumbnailUrl: "",
    members: ["Member 1", "Member 2", "Member 3"]
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isAdminChecking) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="text-muted-foreground uppercase tracking-widest text-xs">Accessing Command Center...</p>
      </div>
    );
  }

  if (!adminRole) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 uppercase italic tracking-tighter">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">Your credentials do not grant administrative privileges. Please contact the high command for clearance.</p>
        <Button onClick={() => router.push("/")} className="mt-8 border-white/20" variant="outline">
          Return to Hub
        </Button>
      </div>
    );
  }

  const handleAddMember = () => {
    setNewEntry(prev => ({ ...prev, members: [...prev.members, `Member ${prev.members.length + 1}`] }));
  };

  const handleMemberChange = (index: number, value: string) => {
    const updated = [...newEntry.members];
    updated[index] = value;
    setNewEntry(prev => ({ ...prev, members: updated }));
  };

  const handleSaveEntry = () => {
    if (!newEntry.teamName || !newEntry.school) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Team name and school are required." });
      return;
    }
    const entry = {
      ...newEntry,
      id: Math.random().toString(36).substr(2, 9),
      members: newEntry.members.map(m => ({ id: Math.random().toString(), name: m }))
    };
    setEntries([entry as any, ...entries]);
    setIsAdding(false);
    toast({ title: "Entry Uploaded", description: `${newEntry.teamName} has been added to the mission.` });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Command Center</h1>
          <p className="text-muted-foreground">Managing {entries.length} active stellar missions</p>
        </div>
        
        <div className="flex gap-4">
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/80 text-white">
                <Plus className="w-4 h-4 mr-2" /> New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Deploy New Hackathon Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-accent">Team Name</label>
                    <Input 
                      placeholder="e.g. Starburst" 
                      value={newEntry.teamName} 
                      onChange={e => setNewEntry({...newEntry, teamName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-accent">School / Institution</label>
                    <Input 
                      placeholder="e.g. Galaxy Tech" 
                      value={newEntry.school} 
                      onChange={e => setNewEntry({...newEntry, school: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-accent">Challenge chosen</label>
                  <Select value={newEntry.challenge} onValueChange={(val: any) => setNewEntry({...newEntry, challenge: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHALLENGES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-accent">Members (Min 3)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {newEntry.members.map((m, i) => (
                      <Input key={i} value={m} onChange={e => handleMemberChange(i, e.target.value)} placeholder={`Member ${i+1}`} />
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddMember} className="mt-2">
                    <Users className="w-4 h-4 mr-2" /> Add Member
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-accent">Google Drive Video (Embed Link)</label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="https://youtube.com/embed/..." 
                        value={newEntry.videoLink} 
                        onChange={e => setNewEntry({...newEntry, videoLink: e.target.value})}
                      />
                      <Button variant="secondary" size="icon"><Video className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-accent">Thumbnail Image URL</label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="https://..." 
                        value={newEntry.thumbnailUrl} 
                        onChange={e => setNewEntry({...newEntry, thumbnailUrl: e.target.value})}
                      />
                      <Button variant="secondary" size="icon"><ImageIcon className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-accent">Project Description</label>
                  <Textarea 
                    placeholder="Briefly describe the mission objective..." 
                    className="h-32"
                    value={newEntry.description}
                    onChange={e => setNewEntry({...newEntry, description: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAdding(false)}>Abort</Button>
                <Button className="bg-accent" onClick={handleSaveEntry}>Initiate Launch</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
            <UploadCloud className="w-4 h-4 mr-2" /> Bulk Scores Upload
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10">
              <TableHead className="text-accent uppercase text-xs">Team & School</TableHead>
              <TableHead className="text-accent uppercase text-xs">Challenge</TableHead>
              <TableHead className="text-accent uppercase text-xs text-center">Current Rank</TableHead>
              <TableHead className="text-accent uppercase text-xs text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id} className="border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-lg">{entry.teamName}</span>
                    <span className="text-xs text-muted-foreground uppercase">{entry.school}</span>
                  </div>
                </TableCell>
                <TableCell>
                   <Badge variant="outline" className="text-[10px] whitespace-nowrap overflow-hidden max-w-[200px] inline-block text-ellipsis">
                    {entry.challenge}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Select defaultValue={entry.rank?.toString() || "NONE"}>
                      <SelectTrigger className="w-24 bg-transparent border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Unranked</SelectItem>
                        <SelectItem value="1">1st Place</SelectItem>
                        <SelectItem value="2">2nd Place</SelectItem>
                        <SelectItem value="3">3rd Place</SelectItem>
                        <SelectItem value="4">Top 10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="ghost" size="icon" className="hover:text-accent"><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-12 flex justify-end">
        <Button className="bg-accent shadow-[0_0_20px_rgba(51,153,255,0.4)] px-8 py-6 text-lg font-bold">
          <Save className="w-5 h-5 mr-2" /> Finalize Ranks & Deploy
        </Button>
      </div>
    </div>
  );
}
