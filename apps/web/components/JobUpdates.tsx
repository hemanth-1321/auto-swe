"use client";

import { useEffect, useState, useRef } from "react";
import { BACKEND_URL } from "@/lib/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface JobUpdatesProps {
  jobId: string | null;
}

type LogEntry = {
  id: number;
  message: string;
  stage: string;
};

const detectStage = (msg: string): string => {
  const lower = msg.toLowerCase();

  if (lower.includes("error")) return "error";
  if (lower.includes("clone")) return "clone";
  if (lower.includes("index") || lower.includes("search")) return "index";
  if (lower.includes("commit")) return "commit";
  if (lower.includes("apply") || lower.includes("modify")) return "apply";
  if (lower.includes("push")) return "push";
  if (lower.includes("done") || lower.includes("success")) return "done";
  return "info";
};

const stageStyles: Record<string, string> = {
  error: "border-red-500/40 bg-red-500/10 text-red-400",
  clone: "border-gray-500/40 bg-gray-500/10 text-gray-300",
  index: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  commit: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
  apply: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  push: "border-purple-500/40 bg-purple-500/10 text-purple-300",
  done: "border-green-500/40 bg-green-500/10 text-green-300",
  info: "border-muted bg-muted/50",
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
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.message) {
          const stage = detectStage(parsed.message);
          setLogs((prev) => [
            ...prev,
            { id: prev.length + 1, message: parsed.message, stage },
          ]);
        }
      } catch {
        const msg = event.data;
        if (msg) {
          const stage = detectStage(msg);
          setLogs((prev) => [
            ...prev,
            { id: prev.length + 1, message: msg, stage },
          ]);
        }
      }
    };

    eventSource.onerror = () => eventSource.close();

    return () => eventSource.close();
  }, [jobId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-background/90 backdrop-blur-sm py-2">
        <h3 className="text-lg font-medium">Live Job Updates</h3>

        <Button
          onClick={() => setLogs([])}
          className="text-sm px-3 py-1.5 border cursor-pointer"
        >
          Clear
        </Button>
      </div>

      {/* SCROLLABLE LOG AREA */}
      <ScrollArea className="flex-1 border rounded-md p-4 font-mono text-sm overflow-y-auto">
        {logs.length === 0 ? (
          <p className="opacity-60">Waiting for updates...</p>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "px-3 py-2 rounded-md border shadow-sm",
                    stageStyles[log.stage]
                  )}
                >
                  {log.message}
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>
          </AnimatePresence>
        )}
      </ScrollArea>
    </div>
  );
}
