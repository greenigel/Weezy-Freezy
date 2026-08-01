import React, { useState, useEffect } from "react";
import { Camera, Calendar, Clock, Plus, Trash2, CheckCircle, VideoOff, Settings, Sparkles, PlayCircle, Video } from "lucide-react";

interface CultivationTask {
  id: string;
  title: string;
  category: "watering" | "nutrients" | "maintenance" | "harvest" | "custom";
  dueAt: string; // ISO String
  frequencyHours: number; // For repeating tasks, 0 for one-time
  description: string;
}

export default function CultivationAssistant() {
  const [streamUrl, setStreamUrl] = useState<string>(() => {
    return localStorage.getItem("cannagrow_stream_url") || "/api/webcam";
  });
  const [timestamp, setTimestamp] = useState(Date.now());
  const [isVideoActive, setIsVideoActive] = useState(true);

  useEffect(() => {
    // If the stream is not an mjpeg stream, assume it's a static image endpoint (like /api/webcam)
    // and refresh it every 5 seconds.
    if (!streamUrl.endsWith(".mjpg") && !streamUrl.endsWith(".mjpeg") && isVideoActive) {
      const interval = setInterval(() => {
        setTimestamp(Date.now());
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [streamUrl, isVideoActive]);

  const [isEditingStream, setIsEditingStream] = useState(false);
  const [tempStreamUrl, setTempStreamUrl] = useState(streamUrl);

  // Default tasks
  const [tasks, setTasks] = useState<CultivationTask[]>(() => {
    const saved = localStorage.getItem("cannagrow_tasks");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }

    const now = new Date();
    return [
      {
        id: "task-1",
        title: "Hydroponik-Wassertank auffüllen",
        category: "watering",
        dueAt: new Date(now.getTime() + 14 * 60 * 60 * 1000).toISOString(), // 14 hours
        frequencyHours: 72,
        description: "Dünger (A+B) anmischen und pH-Wert auf 5.8 trimmen."
      },
      {
        id: "task-2",
        title: "pH & EC Messsonden kalibrieren",
        category: "nutrients",
        dueAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        frequencyHours: 336, // 14 days
        description: "Präzisionsabgleich mit Pufferlösung pH 4.01 und 7.01 durchführen."
      },
      {
        id: "task-3",
        title: "Schnitt & Lollipopping (Blattrand-Pflege)",
        category: "maintenance",
        dueAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
        frequencyHours: 0,
        description: "Unteres Drittel der Pflanze auslichten, um Luftzirkulation zu maximieren."
      },
      {
        id: "task-4",
        title: "Aktivkohlefilter (AKF) Vlies prüfen",
        category: "maintenance",
        dueAt: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days
        frequencyHours: 720, // 30 days
        description: "Vorfiltervlies absaugen oder ersetzen, um Gerüche perfekt zu binden."
      }
    ];
  });

  // Task creation form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<CultivationTask["category"]>("watering");
  const [newDueHours, setNewDueHours] = useState(12);
  const [newFreqHours, setNewFreqHours] = useState(72);
  const [newDesc, setNewDesc] = useState("");



  // Periodical state updates to force countdown ticks
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 10000); // update every 10s
    return () => clearInterval(timer);
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem("cannagrow_tasks", JSON.stringify(tasks));
  }, [tasks]);


  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const dueTime = new Date(Date.now() + newDueHours * 60 * 60 * 1000);
    const newTask: CultivationTask = {
      id: "custom-" + Math.random().toString(36).substring(2, 9),
      title: newTitle,
      category: newCategory,
      dueAt: dueTime.toISOString(),
      frequencyHours: newFreqHours,
      description: newDesc
    };

    setTasks(prev => [...prev, newTask].sort((a,b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()));
    
    // Reset Form
    setNewTitle("");
    setNewDesc("");
    setNewDueHours(12);
    setNewFreqHours(0);
    setShowAddForm(false);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleMarkAsDone = (task: CultivationTask) => {
    if (task.frequencyHours > 0) {
      // Repeating task: calculate next due date
      const nextDue = new Date(Date.now() + task.frequencyHours * 60 * 60 * 1000);
      setTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          return { ...t, dueAt: nextDue.toISOString() };
        }
        return t;
      }).sort((a,b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()));
    } else {
      // One-time task: delete
      handleDeleteTask(task.id);
    }
  };

  // Helper code to render human-readable remaining time
  const getRemainingTimeText = (dueAtString: string) => {
    const diffMs = new Date(dueAtString).getTime() - nowTick;
    if (diffMs <= 0) {
      return { text: "JETZT FÄLLIG", isUrgent: true, isOverdue: true };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);

    if (days > 0) {
      const remainingHours = totalHours % 24;
      return { 
        text: `${days}d ${remainingHours}h`, 
        isUrgent: days <= 1, 
        isOverdue: false 
      };
    }

    const remainingMinutes = totalMinutes % 60;
    return { 
      text: `${totalHours}h ${remainingMinutes}m`, 
      isUrgent: true, 
      isOverdue: false 
    };
  };

  // Icon mapping helper
  const getCategoryColor = (category: CultivationTask["category"]) => {
    switch (category) {
      case "watering": return "border-blue-500/20 text-blue-400 bg-blue-500/5";
      case "nutrients": return "border-emerald-500/20 text-emerald-400 bg-emerald-500/5";
      case "maintenance": return "border-amber-500/20 text-amber-400 bg-amber-500/5";
      case "harvest": return "border-purple-500/20 text-purple-400 bg-purple-500/5";
      default: return "border-slate-700 text-slate-300 bg-slate-800/20";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 🛎️ CULTIVATION ALERTS & REMINDERS WIDGET (Dauer bis zum nächsten Eingriff) */}
      <div id="cultivation-schedule-widget" className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-md space-y-4">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Nächste notwendige Eingriffe</h3>
              <p className="text-4xs text-slate-500 uppercase tracking-wider font-mono">Dauer &amp; Countdown für Routinearbeiten</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1 hover:bg-slate-850 border border-slate-800 text-slate-350 hover:text-white px-2 py-1 rounded-lg text-3xs font-semibold select-none transition"
          >
            <Plus className="h-3 w-3" />
            <span>Neuer Plan</span>
          </button>
        </div>

        {/* Task Creation Form */}
        {showAddForm && (
          <form onSubmit={handleAddTask} className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/80 space-y-3">
            <p className="text-2xs font-extrabold text-white uppercase tracking-wider font-mono flex items-center">
              <Sparkles className="h-3 w-3 text-emerald-400 mr-1.5" />
              Eingriff hinzufügen
            </p>

            <div className="space-y-1">
              <label className="text-4xs text-slate-500 font-mono block">TITEL DER ARBEIT:</label>
              <input
                type="text"
                required
                placeholder="z.B. Stickstoffdünger nachfüllen"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-4xs text-slate-500 font-mono block">KATEGORIE:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as CultivationTask["category"])}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300"
                >
                  <option value="watering">Gießen/Wasser</option>
                  <option value="nutrients">Nährstoffe/pH/EC</option>
                  <option value="maintenance">Schnitt/Pflege/AKF</option>
                  <option value="harvest">Ernte/Trocknung</option>
                  <option value="custom">Sonstiges</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-4xs text-slate-500 font-mono block">FÄLLIG IN (STUNDEN):</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={newDueHours}
                  onChange={(e) => setNewDueHours(Number(e.target.value))}
                  className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-4xs text-slate-500 font-mono block">INTERVALL-WIEDERHOLUNG (0 = einmalig):</label>
              <select
                value={newFreqHours}
                onChange={(e) => setNewFreqHours(Number(e.target.value))}
                className="w-full text-xs px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300"
              >
                <option value="0">Einmaliger Eingriff</option>
                <option value="24">Täglich (Alle 24 Std)</option>
                <option value="72">Alle 3 Tage (72 Std)</option>
                <option value="168">Wöchentlich (168 Std)</option>
                <option value="336">Zweiwöchentlich (336 Std)</option>
                <option value="720">Monatlich (720 Std)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-4xs text-slate-500 font-mono block">BESCHREIBUNG / HINWEISE:</label>
              <textarea
                placeholder="Kurze Anleitung oder Sollbereich..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500/40 font-sans resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-2xs hover:bg-slate-900 border border-slate-800 text-slate-400 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-2xs bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition"
              >
                Hinzufügen
              </button>
            </div>
          </form>
        )}

        {/* Reminders List */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              <CheckCircle className="h-6 w-6 mx-auto mb-1.5 text-slate-700" />
              <span>Keine fälligen Aufgaben oder Kontrollen anberaumt.</span>
            </div>
          ) : (
            tasks.map(task => {
              const remaining = getRemainingTimeText(task.dueAt);
              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-850 hover:border-slate-800 bg-slate-950/35 p-3.5 flex items-start gap-3 transition group relative"
                >
                  {/* Category Pill Icon */}
                  <div className={`p-2 rounded-lg border shrink-0 ${getCategoryColor(task.category)}`}>
                    <Clock className="h-4 w-4" />
                  </div>

                  {/* Task details */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-white transition">
                        {task.title}
                      </h4>
                      
                      <div className="flex items-center space-x-1.5 shrink-0 select-none">
                        {task.frequencyHours > 0 && (
                          <span className="text-3xs text-slate-550 border border-slate-900 px-1 py-0.2 rounded font-mono font-medium">
                            Auto-Loop
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded-full text-4xs font-bold font-mono ${
                          remaining.isOverdue 
                            ? "bg-rose-500/10 border border-rose-500/25 text-rose-450 animate-pulse" 
                            : remaining.isUrgent 
                              ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" 
                              : "bg-slate-900 border border-slate-800 text-slate-400"
                        }`}>
                          {remaining.text}
                        </span>
                      </div>
                    </div>

                    <p className="text-3xs text-slate-450 leading-relaxed mt-1 select-text">
                      {task.description}
                    </p>
                  </div>

                  {/* Actions overlay panel absolute right */}
                  <div className="absolute right-2 top-2.5 flex items-center space-x-1">
                    <button
                      onClick={() => handleMarkAsDone(task)}
                      className="p-1.5 rounded-md hover:bg-emerald-500/15 border border-slate-900 hover:border-emerald-500/25 text-slate-500 hover:text-emerald-400 transition"
                      title={task.frequencyHours > 0 ? "Erledigt! (Timer neu starten)" : "Als erledigt markieren"}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 rounded-md hover:bg-rose-500/15 border border-slate-900 hover:border-rose-500/25 text-slate-500 hover:text-rose-400 transition"
                      title="Löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
