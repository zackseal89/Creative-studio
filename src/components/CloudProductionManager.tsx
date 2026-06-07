import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Trash2, 
  Save, 
  PlusCircle, 
  LogIn, 
  LogOut, 
  AlertCircle, 
  Check, 
  Loader2, 
  FileText,
  User as UserIcon,
  X
} from 'lucide-react';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore';
import { ScriptState, WorkflowPhase, ResearchInsight, ContentPlan, LogLine } from '../types';

interface CloudProductionManagerProps {
  currentTopic: string;
  currentPhase: WorkflowPhase;
  currentResearch: ResearchInsight | null;
  currentPlan: ContentPlan | null;
  currentScript: string | null;
  currentLogs: LogLine[];
  onLoadProject: (state: ScriptState) => void;
  onResetWorkspace: () => void;
  addLog: (message: string, type: 'info' | 'success' | 'warning' | 'thinking') => void;
  onClose: () => void;
}

interface SavedProject {
  projectId: string;
  ownerId: string;
  topic: string;
  phase: string;
  research: any;
  selectedHookIndex: number;
  plan: any;
  script: string | null;
  logs: any[];
  createdAt: any;
  updatedAt: any;
}

export default function CloudProductionManager({
  currentTopic,
  currentPhase,
  currentResearch,
  currentPlan,
  currentScript,
  currentLogs,
  onLoadProject,
  onResetWorkspace,
  addLog,
  onClose
}: CloudProductionManagerProps) {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [customProjectTitle, setCustomProjectTitle] = useState("");

  // Set up Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchProjectsFromFirestore(currentUser.uid);
      } else {
        setProjects([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Alert flash clearers
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorStatus) {
      const timer = setTimeout(() => setErrorStatus(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [errorStatus]);

  // Connect Google account pop-up trigger
  const handleConnect = async () => {
    setIsLoggingIn(true);
    setErrorStatus(null);
    addLog("Opening secure sign-in popup with Google...", "thinking");
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setUser(result.user);
        addLog(`Authenticated successfully as ${result.user.displayName || result.user.email}`, "success");
        setSuccessMessage(`Connected successfully! Welcome.`);
        fetchProjectsFromFirestore(result.user.uid);
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Failed to sign in.");
      addLog("Sign-in sequence canceled or failed.", "warning");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      addLog("Disconnecting Google account...", "info");
      await signOut(auth);
      setUser(null);
      setProjects([]);
      addLog("Auth disconnected successfully.", "info");
      setSuccessMessage("Signed out safely.");
    } catch (err: any) {
      setErrorStatus(err.message || "Logout failed");
    }
  };

  // Fetch from firestore
  const fetchProjectsFromFirestore = async (uid: string) => {
    setIsLoadingList(true);
    setErrorStatus(null);
    const path = "projects";
    try {
      const q = query(
        collection(db, path),
        where("ownerId", "==", uid)
      );
      const querySnapshot = await getDocs(q);
      const projectList: SavedProject[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        projectList.push({
          projectId: data.projectId,
          ownerId: data.ownerId,
          topic: data.topic,
          phase: data.phase,
          research: data.research,
          selectedHookIndex: data.selectedHookIndex || 0,
          plan: data.plan,
          script: data.script,
          logs: data.logs || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      // Sort in-memory to avoid mandatory firestore index requirements on legacy SDK setups
      projectList.sort((a,b) => {
        const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime();
        const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime();
        return bTime - aTime;
      });
      setProjects(projectList);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, path);
    } finally {
      setIsLoadingList(false);
    }
  };

  // Save current workspace state to Cloud Firestore
  const handleSaveToCloud = async () => {
    if (!user) return;
    
    // Fallback topic title if empty or custom field filled
    const topicToSave = customProjectTitle.trim() || currentTopic.trim() || "Untitled Project";
    
    setIsSaving(true);
    setErrorStatus(null);
    
    const cleanId = topicToSave.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 50) || 'default_project';
    const documentPath = `projects/${cleanId}`;

    addLog(`Saving current session to Cloud Firestore under: "${topicToSave}"...`, "thinking");

    try {
      const timestampNow = new Date();
      const payload: any = {
        projectId: cleanId,
        ownerId: user.uid,
        topic: topicToSave,
        phase: currentPhase,
        research: currentResearch,
        selectedHookIndex: 0,
        plan: currentPlan,
        script: currentScript,
        logs: currentLogs,
        createdAt: timestampNow,
        updatedAt: timestampNow
      };

      // Query to check if it exists so we can preserve static createdAt
      const existingProj = projects.find(p => p.projectId === cleanId);
      if (existingProj) {
        payload.createdAt = existingProj.createdAt;
      }

      await setDoc(doc(db, "projects", cleanId), payload);
      
      addLog(`Session "${topicToSave}" persisted safely in your secure cloud account.`, "success");
      setSuccessMessage(`Session saved successfully!`);
      setCustomProjectTitle("");
      
      // Update local storage in case they clear it
      localStorage.setItem('studio_agent_state', JSON.stringify({
        topic: topicToSave,
        phase: currentPhase,
        research: currentResearch,
        selectedHookIndex: 0,
        plan: currentPlan,
        script: currentScript,
        logs: currentLogs
      }));

      // Refresh list
      await fetchProjectsFromFirestore(user.uid);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Failed to persist project structure.");
      addLog(`Failed to sync session with Cloud database: ${err.message}`, "warning");
      handleFirestoreError(err, OperationType.WRITE, documentPath);
    } finally {
      setIsSaving(false);
    }
  };

  // Import project into App workspace
  const handleImportProject = (proj: SavedProject) => {
    onLoadProject({
      topic: proj.topic,
      phase: proj.phase as WorkflowPhase,
      research: proj.research,
      plan: proj.plan,
      script: proj.script,
      logs: proj.logs || []
    });

    addLog(`Successfully restored production session: "${proj.topic}" from Cloud Database.`, "success");
    setSuccessMessage(`Loaded "${proj.topic}" successfully!`);
  };

  // Delete production file
  const handleDeleteProject = async (proj: SavedProject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const confirmDelete = window.confirm(
      `Delete production "${proj.topic}" permanently from the Cloud? This cannot be undone.`
    );
    if (!confirmDelete) return;

    setErrorStatus(null);
    addLog(`Removing project "${proj.topic}"...`, "thinking");

    try {
      await deleteDoc(doc(db, "projects", proj.projectId));
      addLog(`Deleted project file "${proj.topic}" from cloud database.`, "success");
      setSuccessMessage(`Removed successfully.`);
      await fetchProjectsFromFirestore(user.uid);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Deletion failed.");
      addLog(`Delete failed: ${err.message}`, "warning");
    }
  };

  // Fresh New Project workflow
  const handleStartFreshProject = () => {
    if (confirm("Jumping into a completely fresh project? Make sure you have backed up your current workspace to the Cloud first! This will clear current screen values.")) {
      onResetWorkspace();
      setCustomProjectTitle("");
      addLog("Workspace initialized! Ready for fresh creative inputs.", "success");
      setSuccessMessage("Fresh project workspace ready!");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0F0F0F] text-[#E0E0E0] select-none font-sans">
      {/* Drawer Header */}
      <div className="p-5 border-b border-[#222]/80 flex items-center justify-between bg-[#141414]">
        <div className="flex items-center gap-2.5">
          <Cloud className="w-5 h-5 text-[#F27D26]" />
          <span className="font-extrabold text-xs uppercase tracking-[0.2em] text-white">Cloud Workspace</span>
        </div>
        <button 
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Drawer Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Status Alerts */}
        {errorStatus && (
          <div className="bg-[#1A1111] border border-[#ff4d4d]/30 p-3.5 text-xs text-[#ff9999] flex items-start gap-2.5 rounded-none font-mono">
            <AlertCircle className="w-4 h-4 text-[#ff4d4d] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold uppercase tracking-tight block mb-0.5">Database Error</span>
              {errorStatus}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="bg-[#111A13] border border-green-500/30 p-3.5 text-xs text-green-300 flex items-start gap-2.5 rounded-none font-mono">
            <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold uppercase tracking-tight block mb-0.5">Success Event</span>
              {successMessage}
            </div>
          </div>
        )}

        {/* User login / status block */}
        {!user ? (
          <div className="bg-[#0A0A0A] border border-[#222] p-5 text-center space-y-4">
            <div className="w-10 h-10 bg-[#161616] border border-[#333] rounded-none flex items-center justify-center mx-auto">
              <UserIcon className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cloud Storage Offline</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Connect your account to save multiple screenplay concepts, backup workflow outputs, and access saved scripts anytime.
              </p>
            </div>
            <button
              onClick={handleConnect}
              disabled={isLoggingIn}
              className="w-full py-2 px-4 bg-[#F27D26] hover:bg-white text-black text-[10px] uppercase tracking-widest font-extrabold flex items-center justify-center gap-2 cursor-pointer select-none transition-colors disabled:opacity-50"
            >
              {isLoggingIn ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              <span>Connect Google Account</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#0A0A0A] border border-[#222] p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img src={user.photoURL} referrerPolicy="no-referrer" alt="" className="w-6 h-6 rounded-none border border-[#333]" />
                ) : (
                  <div className="w-6 h-6 bg-[#222] flex items-center justify-center border border-[#333]">
                    <UserIcon className="w-3 h-3 text-zinc-400" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white uppercase tracking-tight max-w-[150px] truncate">
                    {user.displayName || 'Creator'}
                  </span>
                  <span className="text-[9px] text-zinc-500 tracking-wide font-mono max-w-[150px] truncate">
                    {user.email}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={handleDisconnect}
                className="text-[9px] hover:text-[#ff4d4d] text-zinc-500 flex items-center gap-1 uppercase font-bold tracking-widest cursor-pointer transition-colors"
                title="Disconnect Account"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Quick Actions Panel */}
            <div className="pt-2 border-t border-[#222] flex gap-2">
              <button
                onClick={handleStartFreshProject}
                className="flex-1 py-1.5 px-3 border border-[#222] hover:border-[#F27D26] hover:text-white text-zinc-400 text-[9px] uppercase tracking-wider font-extrabold flex items-center justify-center gap-1.5 cursor-pointer select-none transition-colors"
              >
                <PlusCircle className="w-3 h-3 text-[#F27D26]" />
                <span>New Project</span>
              </button>
            </div>
          </div>
        )}

        {/* Current Space backup form (only visible if logged in and active/unsaved progress) */}
        {user && (
          <div className="space-y-3.5 bg-[#0A0A0A] border border-[#222] p-4">
            <h4 className="text-[10px] font-extrabold text-[#F27D26] uppercase tracking-widest">
              Save Current Workspace State
            </h4>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                  Production Project Title
                </label>
                <input 
                  type="text"
                  placeholder={currentTopic ? `Using topic brief: "${currentTopic.substring(0, 30)}..."` : "Enter custom project title..."}
                  value={customProjectTitle}
                  onChange={(e) => setCustomProjectTitle(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] p-2 text-[10px] font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-[#F27D26]"
                />
              </div>

              <button
                onClick={handleSaveToCloud}
                disabled={isSaving || (!currentTopic && !customProjectTitle)}
                className="w-full py-2 px-3 bg-[#111] hover:bg-[#F27D26] text-[#F27D26] hover:text-black border border-[#F27D26]/40 hover:border-transparent text-[9px] uppercase tracking-widest font-extrabold flex items-center justify-center gap-2 cursor-pointer select-none transition-all disabled:opacity-30 disabled:hover:bg-[#111] disabled:hover:text-[#F27D26] disabled:hover:border-[#F27D26]/40"
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                <span>💾 Backup current session</span>
              </button>
            </div>
          </div>
        )}

        {/* Saved Project Collections Index list */}
        {user && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.15em]">
                Cloud Productions ({projects.length})
              </span>
            </div>

            {isLoadingList ? (
              <div className="p-8 text-center space-y-2">
                <Loader2 className="w-5 h-5 text-[#F27D26] animate-spin mx-auto animate-pulse" />
                <span className="text-[9px] font-mono uppercase text-zinc-600 tracking-widest">Parsing database indexing...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="border border-dashed border-[#222] p-8 text-center text-zinc-600 text-[10px] uppercase tracking-wide">
                No saved productions found.<br/>Back up your workspace state above.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {projects.map((proj) => (
                  <div
                    key={proj.projectId}
                    onClick={() => handleImportProject(proj)}
                    className="group bg-[#0A0A0A]/50 hover:bg-[#111] border border-[#222] hover:border-[#F27D26]/50 p-3.5 flex items-start justify-between cursor-pointer transition-all duration-200 select-none rounded-none"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
                        <h5 className="text-[10px] font-extrabold uppercase tracking-wide text-white truncate max-w-[170px] group-hover:text-[#F27D26] transition-colors">
                          {proj.topic}
                        </h5>
                      </div>
                      
                      <div className="flex items-center gap-3.5 font-mono text-[8px] text-zinc-500">
                        <span className="bg-[#141414] px-1.5 py-0.5 border border-[#222] text-zinc-400 capitalize">
                          {proj.phase}
                        </span>
                        <span>
                          {proj.updatedAt?.toMillis
                            ? new Date(proj.updatedAt.toMillis()).toLocaleDateString()
                            : new Date(proj.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteProject(proj, e)}
                      className="text-zinc-500 hover:text-[#ff4d4d] p-1 cursor-pointer transition-colors"
                      title="Delete saved file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Branding element */}
      <div className="p-4 border-t border-[#222]/80 bg-[#141414] text-center">
        <span className="text-[8px] tracking-[0.25em] font-mono text-zinc-600 uppercase">
          STORAGE SYSTEM OVERLAY ACTIVE
        </span>
      </div>
    </div>
  );
}
