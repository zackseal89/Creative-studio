import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, 
  CloudRain, 
  Trash2, 
  ExternalLink, 
  Upload, 
  Download, 
  RefreshCw, 
  LogOut, 
  Folder, 
  AlertCircle, 
  Check, 
  Loader2, 
  FileCheck2,
  FileText,
  Image,
  FileJson,
  Plus,
  Copy
} from 'lucide-react';
import { 
  googleSignIn, 
  logout, 
  initAuth, 
  getAccessToken 
} from '../firebase';
import { 
  findOrCreateFolder, 
  listStudioScripts, 
  uploadScript, 
  updateScript, 
  deleteScript, 
  downloadScriptContent,
  uploadRawFile,
  GoogleDriveFile 
} from '../driveService';
import { User } from 'firebase/auth';

interface GoogleDriveExplorerProps {
  currentScript: string | null;
  currentTopic: string;
  onLoadScript: (topic: string, scriptText: string) => void;
  addLog: (message: string, type: 'info' | 'success' | 'warning' | 'thinking') => void;
  onClose: () => void;
}

export default function GoogleDriveExplorer({
  currentScript,
  currentTopic,
  onLoadScript,
  addLog,
  onClose
}: GoogleDriveExplorerProps) {
  // Authentication & Session state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loadingText, setLoadingText] = useState<string | null>(null);
  
  // Google Drive directories state
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>("🎬 AI for Everyone — Media Kit");
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Viewing file modal state
  const [viewingFile, setViewingFile] = useState<{
    file: GoogleDriveFile;
    content: string | null;
    isImage: boolean;
  } | null>(null);

  // Local Custom Confirm Modal (replaces window.confirm which is blocked in sandboxed iframes)
  const [localConfirm, setLocalConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerLocalConfirm = (title: string, message: string, onConfirm: () => void) => {
    setLocalConfirm({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  // Auto clear alerts
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

  // Synchronize Google Folder and fetch metadata list
  const syncFolderContents = useCallback(async (accessToken: string, customFolderName: string = folderName) => {
    setIsLoadingFiles(true);
    setErrorStatus(null);
    try {
      const fid = await findOrCreateFolder(accessToken, customFolderName);
      setFolderId(fid);
      const fileList = await listStudioScripts(accessToken, fid);
      setFiles(fileList);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Failed to synchronize production folder.");
      // Check if unauthorized, might need re-auth
      if (err.message && (err.message.includes("401") || err.message.includes("403") || err.message.includes("auth"))) {
        setToken(null);
        setUser(null);
      }
    } finally {
      setIsLoadingFiles(false);
    }
  }, [folderName]);

  // Listen to Firebase Auth state on load
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, accessToken) => {
        setUser(firebaseUser);
        setToken(accessToken);
        syncFolderContents(accessToken, folderName);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, [syncFolderContents, folderName]);

  // Handle manual Google login trigger
  const handleConnect = async () => {
    setIsLoggingIn(true);
    setErrorStatus(null);
    addLog("Initiating Google Sign-In flow with Google Drive scope...", "thinking");
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        addLog(`Successfully signed in as ${result.user.displayName}`, "success");
        await syncFolderContents(result.accessToken, folderName);
        setSuccessMessage("Google Drive connected successfully!");
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "OAuth login procedure interrupted.");
      addLog("Google Sign-In sequence aborted or failed.", "warning");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Google session
  const handleDisconnect = async () => {
    try {
      addLog("Disconnecting Google Session...", "info");
      await logout();
      setUser(null);
      setToken(null);
      setFiles([]);
      setFolderId(null);
      addLog("Google Drive disconnected successfully.", "info");
    } catch (err: any) {
      setErrorStatus(err.message || "Logout failed.");
    }
  };

  // Trigger Google Picker overlay
  const handleOpenPicker = () => {
    if (!token) {
      setErrorStatus("Auth credentials needed to launch Google Picker. Please sign in.");
      return;
    }
    
    addLog("Initializing Google Picker...", "thinking");
    
    const onPickerApiLoad = () => {
      try {
        const view = new (window as any).google.picker.View((window as any).google.picker.ViewId.DOCS);
        const picker = new (window as any).google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(token)
          .setDeveloperKey("AIzaSyC6112Vb1Nlw_L7ZHyCNkSlIuRHu92XGx0") // Using the valid API key
          .setOrigin(window.location.origin)
          .setCallback(pickerCallback)
          .build();
        picker.setVisible(true);
        addLog("Google Picker container opened successfully.", "success");
      } catch (err: any) {
        console.error(err);
        setErrorStatus(`Google Picker initialization error: ${err.message || err}`);
        addLog(`Picker failed: ${err.message || 'Check Browser constraints.'}`, "warning");
      }
    };

    if ((window as any).google && (window as any).google.picker) {
      onPickerApiLoad();
    } else {
      // Dynamically inject the script loader
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        (window as any).gapi.load('picker', {
          callback: onPickerApiLoad
        });
      };
      script.onerror = () => {
        setErrorStatus("Failed to load Google API client scripts from gapi CDN.");
      };
      document.body.appendChild(script);
    }
  };

  const pickerCallback = async (data: any) => {
    if (data[(window as any).google.picker.Response.ACTION] === (window as any).google.picker.Action.PICKED) {
      const doc = data[(window as any).google.picker.Response.DOCUMENTS][0];
      const pickedId = doc[(window as any).google.picker.Document.ID];
      const pickedName = doc[(window as any).google.picker.Document.NAME];
      const mimeType = doc[(window as any).google.picker.Document.MIME_TYPE];

      setIsLoadingFiles(true);
      addLog(`Picked asset via Google Picker: "${pickedName}"`, 'success');
      
      try {
        const isImg = mimeType?.startsWith('image/') || pickedName.toLowerCase().endsWith('.png') || pickedName.toLowerCase().endsWith('.jpg') || pickedName.toLowerCase().endsWith('.jpeg');
        
        let content: string | null = null;
        if (isImg) {
          const response = await fetch(`https://www.googleapis.com/drive/v3/files/${pickedId}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const blob = await response.blob();
          content = URL.createObjectURL(blob);
        } else {
          content = await downloadScriptContent(token!, pickedId);
        }

        setViewingFile({
          file: {
            id: pickedId,
            name: pickedName,
            mimeType: mimeType || 'application/octet-stream',
            modifiedTime: new Date().toISOString()
          },
          content,
          isImage: isImg
        });
        setSuccessMessage(`Opened Picker asset: "${pickedName}"`);
        await syncFolderContents(token!);
      } catch (err: any) {
        console.error(err);
        setErrorStatus(`Failed to read content: ${err.message}`);
        addLog(`Failed to import file contents: ${err.message}`, "warning");
      } finally {
        setIsLoadingFiles(false);
      }
    }
  };

  // Export current active script to Drive (guarded by overwrite detection)
  const handleExportToDrive = async () => {
    if (!token || !currentScript) return;
    
    setLoadingText("Exporting production...");
    setErrorStatus(null);
    
    try {
      const topicName = currentTopic ? currentTopic.trim() : "untitled_script_production";
      const cleanFileName = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '_') + "_script.md";
      
      let targetFolderId = folderId;
      if (!targetFolderId) {
        targetFolderId = await findOrCreateFolder(token, folderName);
        setFolderId(targetFolderId);
      }

      // Check if duplicate file already exists in our list
      const existingFile = files.find(f => f.name.toLowerCase() === cleanFileName.toLowerCase());
      
      const proceedWithUpload = async (isUpdate: boolean) => {
        setLoadingText(isUpdate ? "Updating file..." : "Uploading file...");
        try {
          if (isUpdate && existingFile) {
            await updateScript(token, existingFile.id, currentScript);
            addLog(`Updated file "${existingFile.name}" in Google Drive successfully.`, 'success');
            setSuccessMessage(`Updated "${existingFile.name}" successfully!`);
          } else {
            const newFile = await uploadScript(token, cleanFileName, currentScript, targetFolderId);
            addLog(`Uploaded new script "${newFile.name}" to Google Drive folder.`, 'success');
            setSuccessMessage(`Saved "${newFile.name}" to Drive!`);
          }
          await syncFolderContents(token, folderName);
        } catch (err: any) {
          console.error(err);
          setErrorStatus(err.message || "Failed to export script.");
          addLog(`Google Drive export failed: ${err.message}`, 'warning');
        } finally {
          setLoadingText(null);
        }
      };

      if (existingFile) {
        triggerLocalConfirm(
          "Overwrite Google Drive File?",
          `A script file named "${existingFile.name}" already exists in your Studio folder. Do you want to update it with your current workspace script?`,
          () => {
            proceedWithUpload(true);
          }
        );
      } else {
        await proceedWithUpload(false);
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Failed to export script.");
      addLog(`Google Drive export failed: ${err.message}`, 'warning');
    }
  };

  // Upload custom asset/prompt/workflow file directly into Drive folder
  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !folderId) return;

    setLoadingText(`Uploading asset "${file.name}"...`);
    addLog(`Initiating upload of dynamic resource: ${file.name}...`, 'thinking');

    try {
      const resp = await uploadRawFile(token, file, folderId);
      addLog(`Resource "${resp.name}" uploaded successfully to media folder!`, 'success');
      setSuccessMessage(`Uploaded "${file.name}" to bank!`);
      await syncFolderContents(token, folderName);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Failed to upload asset.");
      addLog(`Google Drive upload failed: ${err.message}`, 'warning');
    } finally {
      setLoadingText(null);
      e.target.value = '';
    }
  };

  // View / Pull file directly from Drive or view inside explorer
  const handleViewOrImport = async (file: GoogleDriveFile) => {
    if (!token) return;
    setLoadingText(`Accessing ${file.name}...`);
    setErrorStatus(null);

    try {
      const nameLower = file.name.toLowerCase();
      const isImg = file.mimeType?.startsWith('image/') || nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg');

      if (isImg) {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setViewingFile({
          file,
          content: blobUrl,
          isImage: true
        });
        addLog(`Opened image preview of "${file.name}" from drive bank.`, 'success');
      } else {
        const content = await downloadScriptContent(token, file.id);
        
        // If it is a script file (ends in _script.md or script.md), we can pull/import it into Workspace directly,
        // otherwise let user copy prompts/workflows manually inside details viewer.
        const isScriptFile = nameLower.endsWith('_script.md') || nameLower.endsWith('.md');
        if (isScriptFile) {
          triggerLocalConfirm(
            "Load Script to Editor?",
            `Do you want to import "${file.name}" directly into your active script template editor?`,
            () => {
              let derivedTopic = file.name.replace(/_script\.md$/i, '').replace(/\.md$/i, '').replace(/_/g, ' ');
              derivedTopic = derivedTopic.charAt(0).toUpperCase() + derivedTopic.slice(1);
              onLoadScript(derivedTopic, content);
              addLog(`Imported script "${file.name}" into workspace.`, 'success');
              setSuccessMessage(`Loaded "${file.name}"!`);
            }
          );
        } else {
          setViewingFile({
            file,
            content,
            isImage: false
          });
          addLog(`Fetched text contents for prompt template: "${file.name}"`, 'success');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Failed to fetch file content.");
      addLog(`Google Drive access failed: ${err.message}`, 'warning');
    } finally {
      setLoadingText(null);
    }
  };

  // Delete production file from Drive
  const handleDeleteFile = async (file: GoogleDriveFile, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering import on row click
    if (!token) return;

    triggerLocalConfirm(
      "Confirm File Deletion",
      `Are you sure you want to delete "${file.name}" from your Google Drive? This action cannot be undone.`,
      async () => {
        setLoadingText("Deleting...");
        setErrorStatus(null);

        try {
          await deleteScript(token, file.id);
          addLog(`Deleted file "${file.name}" from Google Drive.`, 'success');
          setSuccessMessage(`Deleted file successfully.`);
          // Refresh list
          await syncFolderContents(token, folderName);
        } catch (err: any) {
          console.error(err);
          setErrorStatus(err.message || "Failed to delete file.");
          addLog(`Google Drive deletion failed: ${err.message}`, 'warning');
        } finally {
          setLoadingText(null);
        }
      }
    );
  };

  // Helper to resolve files icon dynamically
  const getFileIcon = (file: GoogleDriveFile) => {
    const nameLower = file.name.toLowerCase();
    if (file.mimeType?.startsWith('image/') || nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg')) {
      return <Image className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
    if (nameLower.endsWith('.json')) {
      return <FileJson className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
    }
    if (nameLower.endsWith('.txt') || nameLower.endsWith('.md')) {
      return <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    return <FileCheck2 className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />;
  };

  return (
    <div className="h-full flex flex-col bg-[#0F0F0F] text-[#E0E0E0] select-none font-sans border-l border-[#222]">
      {/* Panel Header */}
      <div className="h-14 px-5 border-b border-[#222] flex items-center justify-between bg-[#121212] flex-none">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-[#F27D26]" />
          <h4 className="font-extrabold text-[11px] text-zinc-100 uppercase tracking-widest font-mono">Drive Media Bank</h4>
        </div>
        <button 
          onClick={onClose}
          className="text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-widest p-1 border border-transparent hover:border-[#333] transition-all cursor-pointer"
        >
          Close
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
        {/* Status Messages */}
        {errorStatus && (
          <div className="bg-red-950/40 border border-red-500/30 p-3 rounded-none flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="break-all font-mono text-[10px] uppercase leading-relaxed">{errorStatus}</div>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-none flex items-start gap-2.5 text-xs text-emerald-300 animate-slide-in">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="font-mono text-[10px] uppercase tracking-wider">{successMessage}</div>
          </div>
        )}

        {/* Auth Handler Card */}
        {!user ? (
          <div className="space-y-4 py-3 text-center">
            <div className="w-10 h-10 mx-auto rounded-none bg-[#1A1A1A] border border-[#222] flex items-center justify-center">
              <Cloud className="w-5.5 h-5.5 text-zinc-500" />
            </div>
            
            <div className="space-y-1.5 px-2">
              <p className="text-[11px] uppercase tracking-widest font-extrabold text-white">Drive Offline</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide leading-relaxed">
                Connect your personal Google account to access your Media Kit resources, save workflow configurations, prompts, and view image banks safely.
              </p>
            </div>

            {/* Compliance with GSI Button styles */}
            <div className="flex justify-center pt-2">
              <button 
                onClick={handleConnect}
                disabled={isLoggingIn}
                className="gsi-material-button text-xs font-bold"
                style={{
                  background: 'white',
                  border: '1px solid #dadce0',
                  borderRadius: '0px',
                  color: '#3c4043',
                  cursor: 'pointer',
                  fontFamily: 'Roboto, arial, sans-serif',
                  fontSize: '14px',
                  height: '40px',
                  letterSpacing: '0.25px',
                  outline: 'none',
                  overflow: 'hidden',
                  padding: '0 12px',
                  position: 'relative',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  width: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontWeight: 500,
                }}
              >
                {isLoggingIn ? (
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="gsi-material-button-content-wrapper flex items-center gap-2">
                    <div className="gsi-material-button-icon shrink-0">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "18px", height: "18px" }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents" style={{ color: '#1f1f1f', fontWeight: 600 }}>Sign in with Google</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected Info Header */}
            <div className="bg-[#141414] border border-[#222] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Google Profile" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-[#333]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#F27D26]/20 border border-[#F27D26]/40 flex items-center justify-center text-[#F27D26] font-extrabold text-[11px]">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold text-white uppercase tracking-wider truncate">{user.displayName}</p>
                  <p className="text-[9px] text-zinc-500 font-mono truncate">{user.email}</p>
                </div>

                <button 
                  onClick={handleDisconnect}
                  className="text-zinc-500 hover:text-red-400 p-1 rounded-none hover:bg-red-950/20 transition-all cursor-pointer"
                  title="Disconnect account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Editable Sync Folder name */}
              <div className="border-t border-[#222] pt-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Folder className="w-3 h-3 text-[#F27D26]" />
                    ACTIVE DRIVE FOLDER:
                  </span>
                  <button 
                    onClick={() => {
                      if (token) syncFolderContents(token, folderName);
                    }} 
                    className="hover:text-[#F27D26] transition-colors flex items-center gap-1 text-[8px] uppercase tracking-wider font-extrabold"
                    title="Reload Drive folder"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Sync</span>
                  </button>
                </div>
                
                <div className="flex items-center gap-1.5 bg-[#090909] border border-[#222] px-2 py-1">
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && token) {
                        syncFolderContents(token, folderName);
                      }
                    }}
                    className="w-full bg-transparent text-[11px] text-white font-mono focus:outline-none placeholder-zinc-700"
                    placeholder="E.g. 🎬 AI for Everyone — Media Kit"
                  />
                </div>
                <p className="text-[8px] text-zinc-500 font-mono leading-normal uppercase">
                  Press enter or click Sync to query or create folder.
                </p>
              </div>
            </div>

            {/* Local Upload Tool to Bank */}
            <div className="border border-dashed border-[#223] bg-[#0A0A0A] p-3 text-center transition-colors hover:border-[#F27D26]/40">
              <Upload className="w-4 h-4 mx-auto mb-1 text-zinc-500" />
              <p className="text-[9px] font-extrabold text-zinc-300 uppercase tracking-widest leading-none">Upload or Pick Asset</p>
              <p className="text-[8px] text-zinc-500 uppercase font-mono mt-1 leading-normal mb-2">Workflows, Prompts or Images (Max 15MB)</p>
              
              <div className="flex gap-2 justify-center">
                <label className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] hover:border-[#F27D26] text-[8px] text-[#F27D26] hover:text-white font-mono font-extrabold uppercase tracking-widest cursor-pointer transition-colors">
                  Choose File
                  <input 
                    type="file"
                    onChange={handleAssetUpload}
                    className="hidden" 
                    accept="image/*,.json,.txt,.md"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleOpenPicker}
                  className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] hover:border-[#F27D26] text-[8px] text-[#F27D26] hover:text-white font-mono font-extrabold uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Google Picker
                </button>
              </div>
            </div>

            {/* Cloud Export Current Script */}
            {currentScript && (
              <button
                onClick={handleExportToDrive}
                disabled={loadingText !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#F27D26] hover:bg-white text-black font-extrabold text-[10px] uppercase tracking-widest rounded-none transition-all duration-300 border border-[#F27D26] hover:border-white cursor-pointer disabled:opacity-50"
              >
                {loadingText === "Exporting production..." ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving script to Drive...</span>
                  </>
                ) : (
                  <>
                    <Folder className="w-3.5 h-3.5" />
                    <span>Save script to Drive folder</span>
                  </>
                )}
              </button>
            )}

            {/* Directory Files List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#222] pb-1.5 select-none">
                <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest">Folder Banks & Resources</span>
                <span className="text-[9px] font-mono text-[#F27D26]">{files.length} ITEMS</span>
              </div>

              {isLoadingFiles ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 text-zinc-650 animate-spin" />
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Querying files...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-[#222] p-4 text-zinc-655 bg-[#0A0A0A]/40">
                  <CloudRain className="w-5 h-5 mx-auto mb-1 opacity-20 text-[#F27D26]" />
                  <p className="text-[10px] uppercase tracking-widest font-extrabold text-zinc-400">Library Empty</p>
                  <p className="text-[8px] uppercase tracking-wide mt-1 text-zinc-550 max-w-[180px] mx-auto leading-relaxed">
                    Upload reusable images, workflows or prompts to populate your resource bank.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {files.map((file) => (
                    <div 
                      key={file.id} 
                      onClick={() => handleViewOrImport(file)}
                      className="group p-2 bg-[#090909] hover:bg-[#141414] border border-[#222] hover:border-[#333] rounded-none flex items-center justify-between cursor-pointer transition-all"
                      title={file.mimeType?.startsWith('image/') ? "Click to view image" : "Click to view contents / copy reusable prompt"}
                    >
                      <div className="min-w-0 pr-3 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {getFileIcon(file)}
                          <p className="text-[10px] font-bold text-zinc-300 group-hover:text-white transition-colors truncate">
                            {file.name}
                          </p>
                        </div>
                        <p className="text-[8px] text-zinc-500 font-mono">
                          MOD: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>

                      {/* Action Triggers */}
                      <div className="flex items-center gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                        {file.webViewLink && (
                          <a 
                            href={file.webViewLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()} // Stop row loader trigger
                            className="p-1 text-zinc-400 hover:text-white border border-[#222] bg-[#0F0F0F] hover:bg-black transition-colors"
                            title="Open in Drive"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button 
                          onClick={(e) => handleDeleteFile(file, e)}
                          className="p-1 text-zinc-450 hover:text-red-400 border border-[#222] bg-[#0F0F0F] hover:bg-black transition-colors cursor-pointer"
                          title="Delete file permanently"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resource Detail Dynamic Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 min-h-screen w-screen z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-[#222] max-w-lg w-full p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex items-center justify-between border-b border-[#222] pb-2">
              <div className="flex items-center gap-2">
                {getFileIcon(viewingFile.file)}
                <h3 className="font-extrabold text-[11px] uppercase tracking-wider text-white truncate max-w-[280px]">
                  {viewingFile.file.name}
                </h3>
              </div>
              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest bg-[#151515] px-2 py-0.5 border border-[#222]">
                {viewingFile.file.mimeType}
              </span>
            </div>

            {/* Document Content Display */}
            <div className="max-h-[300px] overflow-y-auto bg-[#050505] p-3 border border-[#1A1A1A] font-mono text-[10px] text-zinc-300 scrollbar-thin select-all whitespace-pre-wrap break-words">
              {viewingFile.isImage ? (
                <div className="flex justify-center items-center py-2 bg-zinc-950/40">
                  <img 
                    src={viewingFile.content || ""} 
                    alt={viewingFile.file.name}
                    className="max-h-[250px] object-contain border border-[#222] my-1"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                viewingFile.content || "No content inside resource found."
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[8px] font-mono text-zinc-500 uppercase font-bold">
                Size: {viewingFile.file.mimeType?.startsWith('image/') ? 'Image binary' : `${((viewingFile.content?.length || 0) / 1024).toFixed(1)} KB`}
              </span>
              <div className="flex items-center gap-2">
                {!viewingFile.isImage && viewingFile.content && (
                  <button
                    type="button"
                    onClick={() => {
                      if (viewingFile.content) {
                        navigator.clipboard.writeText(viewingFile.content);
                        addLog(`Copied prompt template details from "${viewingFile.file.name}" to clipboard.`, 'success');
                        setSuccessMessage("Copied to clipboard!");
                      }
                    }}
                    className="px-3.5 py-1.5 bg-[#151515] hover:bg-zinc-800 text-zinc-300 border border-[#222] text-[9px] tracking-widest font-extrabold uppercase transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-[#F27D26]" />
                    <span>Copy Contents</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingFile(null)}
                  className="px-4 py-1.5 bg-[#F27D26] hover:bg-white text-black text-[9px] tracking-widest font-extrabold uppercase transition-all duration-200 cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mask Loader indicator */}
      {loadingText && (
        <div className="absolute inset-0 bg-black/80 flex flex-col justify-center items-center gap-3 z-50">
          <Loader2 className="w-6 h-6 text-[#F27D26] animate-spin" />
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-zinc-300 font-mono select-none">{loadingText}</span>
        </div>
      )}

      {/* Elegant Local In-App Confirm modal overlay */}
      {localConfirm.isOpen && (
        <div className="fixed inset-0 min-h-screen w-screen z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0F0F0F] border border-[#222] max-w-sm w-full p-5 space-y-5 shadow-2xl relative text-left">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[#F27D26]">
                <FileText className="w-4 h-4 animate-pulse text-[#F27D26]" />
                <h3 className="font-extrabold text-[11px] uppercase tracking-[0.2em] text-white font-mono">{localConfirm.title || "Confirm Action"}</h3>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono leading-relaxed uppercase tracking-wider">{localConfirm.message}</p>
            </div>
            
            <div className="flex items-center justify-end space-x-3 pt-1">
              <button
                type="button"
                onClick={() => setLocalConfirm(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 border border-[#222] text-[9px] tracking-widest font-extrabold uppercase transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  localConfirm.onConfirm();
                  setLocalConfirm(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-3.5 py-1.5 bg-[#F27D26] hover:bg-white text-black text-[9px] tracking-widest font-extrabold uppercase transition-all duration-200 cursor-pointer"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
