import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  AlertCircle, 
  Check, 
  RefreshCw, 
  LogOut, 
  CalendarPlus, 
  Video, 
  FileText, 
  Volume2, 
  Compass, 
  Rocket,
  Edit2
} from 'lucide-react';
import { 
  googleSignIn, 
  logout, 
  initAuth 
} from '../firebase';
import { User } from 'firebase/auth';

interface ProductionCalendarProps {
  currentTopic: string;
  addLog: (message: string, type: 'info' | 'success' | 'warning' | 'thinking') => void;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  htmlLink?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

const MILESTONES = [
  { label: '💡 Production Outline Vetting', icon: Compass, duration: 60, defaultDesc: 'Deconstruct the hook structures, verify search trends, and refine the storyboards using AI analytics.' },
  { label: '📝 High Retention Script Writing', icon: FileText, duration: 120, defaultDesc: 'Draft high engagement screenplay. Focus on early retention bridges, explainer modules, and retention graphs.' },
  { label: '🔊 Sound & SFX Orchestration', icon: Volume2, duration: 90, defaultDesc: 'Design sound loops, generate speech synthesizers, and align SFX pacing to dynamic scripts.' },
  { label: '🎬 Cinematic Media Capture', icon: Video, duration: 180, defaultDesc: 'Record screen-shares, camera rolls, and capture vision frames matched strictly to storyboards.' },
  { label: '🚀 Video SEO & Final Deployment', icon: Rocket, duration: 45, defaultDesc: 'Launch ready YouTube scripts, tags, captions, and synchronize descriptions with Google Drive Media Kit.' }
];

export default function ProductionCalendar({
  currentTopic,
  addLog
}: ProductionCalendarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for creating a new milestone
  const [selectedMilestone, setSelectedMilestone] = useState(MILESTONES[0]);
  const [eventTopic, setEventTopic] = useState(currentTopic || '');
  const [eventDate, setEventDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // Default to tomorrow 10:00 AM
    return tomorrow.toISOString().substring(0, 16); // format: YYYY-MM-DDTHH:MM
  });
  const [eventDescription, setEventDescription] = useState(MILESTONES[0].defaultDesc);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Custom Confirmation state
  const [confirmModal, setConfirmModal] = useState<{
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

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  // Sync event date & description when milestone changes
  const handleMilestoneChange = (milestoneName: string) => {
    const milestone = MILESTONES.find(m => m.label === milestoneName);
    if (milestone) {
      setSelectedMilestone(milestone);
      setEventDescription(milestone.defaultDesc);
    }
  };

  // Auto update topic to state when prop changes
  useEffect(() => {
    if (currentTopic) {
      setEventTopic(currentTopic);
    }
  }, [currentTopic]);

  // Sync / query calendar meetings
  const fetchCalendarEvents = useCallback(async (accessToken: string) => {
    setIsLoading(true);
    setErrorStatus(null);
    try {
      const now = new Date().toISOString();
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&timeMin=${now}&maxResults=15`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Expired or unauthorized Google Session. Please connect credentials.");
        }
        throw new Error(`Google Calendar API failed with status ${response.status}`);
      }

      const data = await response.json();
      setEvents(data.items || []);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Failed to sync Google Calendar.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, accessToken) => {
        setUser(firebaseUser);
        setToken(accessToken);
        fetchCalendarEvents(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setEvents([]);
      }
    );
    return () => unsubscribe();
  }, [fetchCalendarEvents]);

  // Auth controllers
  const handleConnect = async () => {
    setIsLoggingIn(true);
    setErrorStatus(null);
    addLog("Initiating Google authentication with Google Calendar permission...", "thinking");
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        addLog(`Successfully connected with calendar scopes for ${result.user.displayName}`, "success");
        setSuccessMessage("Calendar integration authenticated!");
        await fetchCalendarEvents(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Authentication rejected.");
      addLog("Authentication popup closed or credentials declined.", "warning");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      addLog("Revoking calendar credentials...", "info");
      await logout();
      setUser(null);
      setToken(null);
      setEvents([]);
      addLog("Google Calendar disconnected successfully.", "info");
    } catch (err: any) {
      setErrorStatus(err.message || "Logout failed.");
    }
  };

  // CREATE Event (Ask user first)
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const summaryTitle = `${selectedMilestone.label.split(' ').slice(1).join(' ')}: ${eventTopic ? eventTopic.trim() : 'Unnamed Production'}`;
    const startObj = new Date(eventDate);
    const endObj = new Date(startObj.getTime() + selectedMilestone.duration * 60 * 1000);

    triggerConfirm(
      "Create Google Calendar Event?",
      `This will create the event "${summaryTitle}" starting at ${startObj.toLocaleString()} on your Google Calendar. Do you want to proceed?`,
      async () => {
        setIsSubmitting(true);
        setErrorStatus(null);
        addLog(`Scheduling workspace milestone: "${summaryTitle}"...`, 'thinking');

        try {
          const body = {
            summary: summaryTitle,
            description: `${eventDescription}\n\nScheduled automatically via Studio.Agent Workflow Workspace.`,
            start: {
              dateTime: startObj.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: endObj.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            colorId: '4' // Light orange/yellow color ID
          };

          const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(body)
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to create calendar meeting: status ${response.status}`);
          }

          addLog(`Event "${summaryTitle}" successfully written to primary Calendar!`, 'success');
          setSuccessMessage("Milestone scheduled successfully!");
          
          // Reset topic and update events list
          await fetchCalendarEvents(token);
        } catch (err: any) {
          console.error(err);
          setErrorStatus(err.message || "Failed to schedule calendar event.");
          addLog(`Calendar write failed: ${err.message}`, 'warning');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  // UPDATE Event - Shift Date by 1 Day (Ask user first)
  const handleUpdateEvent = async (event: CalendarEvent) => {
    if (!token) return;

    triggerConfirm(
      "Reschedule Production Milestone?",
      `Are you sure you want to postpone "${event.summary}" by exactly 24 hours on your Google Calendar?`,
      async () => {
        setIsLoading(true);
        setErrorStatus(null);
        addLog(`Rescheduling milestone: "${event.summary}"...`, 'thinking');

        try {
          let currentStart = event.start.dateTime || event.start.date;
          let currentEnd = event.end.dateTime || event.end.date;

          if (!currentStart || !currentEnd) {
            throw new Error("Target event is a multi-day event and cannot be shifted automatically.");
          }

          const newStart = new Date(new Date(currentStart).getTime() + 24 * 60 * 60 * 1000);
          const newEnd = new Date(new Date(currentEnd).getTime() + 24 * 60 * 60 * 1000);

          const updatedBody = {
            summary: event.summary,
            description: event.description,
            start: {
              dateTime: newStart.toISOString()
            },
            end: {
              dateTime: newEnd.toISOString()
            }
          };

          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updatedBody)
            }
          );

          if (!response.ok) {
            throw new Error(`Reschedule failed: status ${response.status}`);
          }

          addLog(`Successfully postponed: "${event.summary}" was shifted to ${newStart.toLocaleDateString()}.`, 'success');
          setSuccessMessage("Production rescheduled!");
          await fetchCalendarEvents(token);
        } catch (err: any) {
          console.error(err);
          setErrorStatus(err.message || "Failed to shift calendar milestone.");
          addLog(`Failed to postpone: ${err.message}`, 'warning');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  // DELETE Event (Ask user first)
  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (!token) return;

    triggerConfirm(
      "Delete Calendar Event?",
      `Are you sure you want to permanently remove "${event.summary}" from your Google Calendar? This action is irreversible.`,
      async () => {
        setIsLoading(true);
        setErrorStatus(null);
        addLog(`Removing calendar event: "${event.summary}"...`, 'thinking');

        try {
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          if (!response.ok) {
            throw new Error(`Removal query failed: status ${response.status}`);
          }

          addLog(`Successfully deleted event "${event.summary}" from primary Google Calendar.`, 'success');
          setSuccessMessage("Event removed successfully.");
          await fetchCalendarEvents(token);
        } catch (err: any) {
          console.error(err);
          setErrorStatus(err.message || "Failed to delete from Calendar.");
          addLog(`Calendar deletion aborted: ${err.message}`, 'warning');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#0A0A0A] text-[#E0E0E0] select-none font-sans overflow-hidden">
      {/* Left Column: Schedule Milestone Form */}
      <div className="w-full md:w-[420px] p-6 lg:p-8 border-b md:border-b-0 md:border-r border-[#222]/40 overflow-y-auto h-full scrollbar-none flex flex-col justify-start">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#F27D26]/10 border border-[#F27D26]/35 flex items-center justify-center text-[#F27D26] rounded-none">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">MILTONE SCHEDULER</h2>
              <p className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Plan script phases directly to Google Calendar</p>
            </div>
          </div>

          {errorStatus && (
            <div className="bg-red-950/40 border border-red-500/30 p-3 rounded-none flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
              <div className="break-all font-mono text-[9px] uppercase leading-relaxed">{errorStatus}</div>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-none flex items-start gap-2.5 text-xs text-emerald-300">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="font-mono text-[9px] uppercase tracking-wider">{successMessage}</div>
            </div>
          )}

          {!user ? (
            <div className="bg-[#0E0E0E] border border-[#222] p-6 text-center space-y-4 rounded-none">
              <div className="w-10 h-10 bg-[#151515] border border-[#333] flex items-center justify-center mx-auto">
                <Calendar className="w-5.5 h-5.5 text-zinc-500" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-extrabold text-white uppercase tracking-wider">Calendar Offline</p>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-mono uppercase">
                  Log in with your Google Workspace credentials to list upcoming production deadlines, sync shooting events, and write video releases.
                </p>
              </div>

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
                    fontSize: '13px',
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
                    fontWeight: 600,
                  }}
                >
                  {isLoggingIn ? (
                    <div className="flex items-center gap-2 text-zinc-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Secure API...</span>
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
                      <span className="gsi-material-button-contents" style={{ color: '#1f1f1f', fontWeight: 650 }}>Link Google Calendar</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="p-3 bg-[#111] border border-[#222] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-6.5 h-6.5 rounded-full border border-[#222]" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6.5 h-6.5 rounded-full bg-[#F27D26]/20 border border-[#F27D26]/50 flex items-center justify-center font-bold text-[9px] text-[#F27D26]">U</div>
                  )}
                  <div className="leading-tight truncate max-w-[150px]">
                    <p className="text-[10px] text-zinc-300 font-bold uppercase truncate">{user.displayName}</p>
                    <p className="text-[8px] text-zinc-500 font-mono truncate">{user.email}</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={handleDisconnect} 
                  className="px-2 py-1 bg-[#1A1A1A] hover:bg-red-950/20 text-[9px] font-mono hover:text-red-400 border border-[#222] uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {/* Milestone Selection */}
              <div className="space-y-1">
                <label className="text-[9px] text-[#888] font-black uppercase tracking-wider font-mono">1. Select Milestone Phase</label>
                <select
                  value={selectedMilestone.label}
                  onChange={(e) => handleMilestoneChange(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] p-2 text-xs text-white focus:outline-none focus:border-[#F27D26] font-sans"
                >
                  {MILESTONES.map((milestone) => (
                    <option key={milestone.label} value={milestone.label}>
                      {milestone.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Title / Topic context */}
              <div className="space-y-1">
                <label className="text-[9px] text-[#888] font-black uppercase tracking-wider font-mono">2. Video Topic Subject Context</label>
                <input
                  type="text"
                  value={eventTopic}
                  onChange={(e) => setEventTopic(e.target.value)}
                  placeholder="e.g. Future of Generative AI Video"
                  className="w-full bg-[#111] border border-[#222] p-2 text-xs text-white focus:outline-none focus:border-[#F27D26] font-sans"
                />
              </div>

              {/* Event Date and hour selector */}
              <div className="space-y-1">
                <label className="text-[9px] text-[#888] font-black uppercase tracking-wider font-mono">3. Date & Start Time</label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] p-2 text-xs text-white focus:outline-none focus:border-[#F27D26] font-mono"
                />
              </div>

              {/* Duration and description readouts */}
              <div className="bg-[#111] border border-[#222] p-3 text-[10px] space-y-1.5 font-mono">
                <p className="flex justify-between uppercase">
                  <span className="text-zinc-500">Milestone Duration:</span>
                  <span className="text-white font-bold">{selectedMilestone.duration} MINUTES</span>
                </p>
                <div className="text-zinc-400 uppercase leading-relaxed text-[9px] border-t border-[#222] pt-1.5 leading-normal">
                  {eventDescription}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#F27D26] hover:bg-white text-black font-extrabold text-[10px] uppercase tracking-widest transition-all duration-300 border border-[#F27D26] hover:border-white select-none shadow hover:shadow-orange-500/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Writing Event...</span>
                  </>
                ) : (
                  <>
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Schedule Milestone</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Right Column: Events List / Cloud Calendar representation */}
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto h-full scrollbar-thin flex flex-col justify-start">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#222] pb-3 select-none">
            <div className="flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-[#F27D26]" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">UPCOMING WORKSPACE SCHEDULES</h3>
            </div>
            {token && (
              <button 
                onClick={() => fetchCalendarEvents(token)} 
                className="text-zinc-500 hover:text-[#F27D26] flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider transition-colors"
                title="Sync from Google Calendar API"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Pull Live Feed</span>
              </button>
            )}
          </div>

          {!user ? (
            <div className="py-20 text-center border border-dashed border-[#222] bg-[#0A0A0A]">
              <Calendar className="w-7 h-7 mx-auto mb-2 text-zinc-700 opacity-60" />
              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest leading-none">Primary Feed Offline</p>
              <p className="text-[8px] uppercase font-mono mt-1 text-zinc-650 max-w-[240px] mx-auto leading-relaxed">
                Connect your account using the Milestone Scheduler panel to display upcoming scheduled events here.
              </p>
            </div>
          ) : isLoading ? (
            <div className="py-24 text-center space-y-3">
              <Loader2 className="w-7 h-7 text-[#F27D26] animate-spin mx-auto animate-pulse" />
              <p className="text-[9px] font-mono uppercase tracking-widest text-[#888]">Inquiring Google Calendar events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-[#222] bg-[#0E0E0E]/40">
              <Calendar className="w-7 h-7 mx-auto mb-2 text-zinc-600 opacity-30" />
              <p className="text-[10px] uppercase font-extrabold text-[#F27D26] tracking-widest">Workspace Schedule Empty</p>
              <p className="text-[8px] uppercase font-mono mt-1 text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
                No upcoming video milestones discovered. Schedule outline vetting or final SEO uploads to begin planning.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 pb-8">
              {events.map((event) => {
                const startStr = event.start.dateTime || event.start.date || '';
                const startTime = new Date(startStr);
                const isOverdue = startTime.getTime() < Date.now();
                
                return (
                  <div 
                    key={event.id}
                    className="p-4 bg-[#0E0E0E] hover:bg-[#131313] border border-[#222] hover:border-[#333] transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 select-none"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-1.5 shrink-0 ${isOverdue ? 'bg-zinc-650' : 'bg-[#F27D26] animate-pulse'}`}></div>
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-extrabold text-white uppercase tracking-wider leading-relaxed truncate group-hover:text-[#F27D26]">
                            {event.summary}
                          </h4>
                          <p className="text-[9px] text-zinc-500 font-mono uppercase leading-normal tracking-wide mt-1 italic max-w-[500px] break-words">
                            {event.description?.split('\n\n')[0] || "No description provided."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4.5 font-mono text-[8px] text-zinc-500 uppercase tracking-widest pl-5 select-none">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#F27D26]" />
                          {startTime.toLocaleDateString()} @ {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOverdue && (
                          <span className="bg-[#1A1A1A] p-0.5 border border-[#303030] text-zinc-400 font-extrabold">OVERDUE</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                      {event.htmlLink && (
                        <a 
                          href={event.htmlLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1 px-2.5 bg-[#141414] hover:bg-black text-zinc-400 hover:text-white text-[9px] border border-[#222] uppercase tracking-wider font-mono flex items-center gap-1.5 rounded-none transition-colors"
                          title="Open Event in Calendar Website"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View API</span>
                        </a>
                      )}

                      <button 
                        onClick={() => handleUpdateEvent(event)}
                        className="p-1 px-2.2 bg-[#141414] hover:bg-[#F27D26]/10 text-zinc-400 hover:text-[#F27D26] text-[9px] border border-[#222] hover:border-[#F27D26]/60 uppercase tracking-wider font-mono flex items-center gap-1 rounded-none transition-all cursor-pointer"
                        title="Shift/Postpone deadline by exactly 1 day"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reschedule</span>
                      </button>

                      <button 
                        onClick={() => handleDeleteEvent(event)}
                        className="p-1.5 bg-[#191111] hover:bg-[#331414] text-zinc-400 hover:text-red-400 border border-[#4a2424]/40 hover:border-red-500/50 transition-all rounded-none cursor-pointer"
                        title="Permanently remove milestone"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Overlay popup dialog (Bypasses sandboxed iframe block constraints on window.confirm) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 min-h-screen w-screen z-[999999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-[#0F0F0F] border border-[#222] max-w-sm w-full p-5 space-y-5 shadow-2xl relative text-left rounded-none">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[#F27D26]">
                <Calendar className="w-4.5 h-4.5 animate-pulse text-[#F27D26]" />
                <h3 className="font-extrabold text-[11px] uppercase tracking-[0.2em] text-white font-mono">{confirmModal.title}</h3>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono leading-relaxed uppercase tracking-wider">{confirmModal.message}</p>
            </div>
            
            <div className="flex items-center justify-end space-x-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] text-[#888] border border-[#222] text-[9px] tracking-widest font-extrabold uppercase transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-3.5 py-1.5 bg-[#F27D26] hover:bg-white text-black text-[9px] tracking-widest font-extrabold uppercase transition-all duration-200 cursor-pointer"
              >
                Proceed Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
