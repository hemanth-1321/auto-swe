"use client";

import { useEffect, useState, useRef } from "react";
import { BACKEND_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Terminal,
  Trash2,
  Activity,
  CheckCircle2,
  XCircle,
  GitCommit,
  ArrowUpCircle,
  Loader2,
} from "lucide-react";

interface JobUpdatesProps {
  jobId: string | null;
}

type LogEntry = {
  id: number;
  message: string;
  stage: string;
  timestamp: string;
};

const detectStage = (msg: string): string => {
  const lower = msg.toLowerCase();
  if (lower.includes("error") || lower.includes("failed")) return "error";
  if (lower.includes("done") || lower.includes("success")) return "done";
  if (lower.includes("clone") || lower.includes("fetching")) return "clone";
  if (lower.includes("push") || lower.includes("deploy")) return "push";
  return "info";
};

const getIcon = (stage: string) => {
  switch (stage) {
    case "error":
      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case "done":
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case "clone":
      return <GitCommit className="w-3.5 h-3.5 text-blue-500" />;
    case "push":
      return <ArrowUpCircle className="w-3.5 h-3.5 text-purple-500" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-zinc-600" />;
  }
};

export function JobUpdates({ jobId }: JobUpdatesProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jobId) return;

    setLogs([]);

    const eventSource = new EventSource(
      `${BACKEND_URL}/publish/updates/${jobId}`
    );

    eventSource.onmessage = (event) => {
      const addLog = (text: string) => {
        const timestamp = new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setLogs((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            message: text,
            stage: detectStage(text),
            timestamp,
          },
        ]);
      };

      try {
        const parsed = JSON.parse(event.data);
        if (parsed.message) addLog(parsed.message);
      } catch {
        if (event.data) addLog(event.data);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [jobId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [logs]);

  const handleClear = () => setLogs([]);

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] border border-white/10 shadow-2xl overflow-hidden ring-1 ring-white/5">
      {/* Header: Fixed height */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/2">
        <div className="flex items-center gap-3">
          {/* Mac-style Window Controls */}
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
          </div>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 font-mono tracking-tight">
            <Terminal className="w-3.5 h-3.5" />
            <span>TERMINAL</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {jobId && (
            <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-500 font-medium uppercase tracking-wider animate-pulse">
              Active
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="h-6 w-6 text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Logs Area: Preserved flex-1 min-h-0 logic for perfect scrolling */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0 font-mono text-[13px] leading-relaxed custom-scrollbar bg-black/40">
        <div className="space-y-0.5">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-700 space-y-4 min-h-[200px]">
              <div className="w-16 h-16 rounded-full bg-white/2 border border-white/5 flex items-center justify-center">
                <Terminal className="w-6 h-6 opacity-30" />
              </div>
              <p className="text-xs tracking-widest uppercase opacity-40 font-semibold">
                System Idle
              </p>
            </div>
          ) : (
            <>
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "group flex items-start gap-3 py-1 px-2 -mx-2 rounded transition-all",
                    log.stage === "error"
                      ? "bg-red-500/5 text-red-400 border-l-2 border-red-500/50"
                      : "text-zinc-400 hover:bg-white/2 hover:text-zinc-300"
                  )}
                >
                  <span className="shrink-0 text-[10px] text-zinc-600 pt-0.5 select-none w-14 font-mono opacity-50">
                    {log.timestamp}
                  </span>
                  <span className="mt-[3px] shrink-0 opacity-80">
                    {getIcon(log.stage)}
                  </span>
                  <span className="break-all whitespace-pre-wrap font-light tracking-tight">
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={bottomRef} className="h-px w-full" />

              {/* Blinking Cursor Effect */}
              <div className="flex items-center gap-2 px-2 opacity-50 mt-1">
                <span className="w-14"></span>
                <span className="w-1.5 h-4 bg-zinc-600 animate-pulse block"></span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
