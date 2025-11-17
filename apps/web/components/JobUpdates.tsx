"use client";

import { useEffect, useState, useRef } from "react";
import { BACKEND_URL } from "@/lib/constants";
import { motion, AnimatePresence } from "motion/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

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
        if (event.data) {
          const stage = detectStage(event.data);
          setLogs((prev) => [
            ...prev,
            { id: prev.length + 1, message: event.data, stage },
          ]);
        }
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleClear = () => setLogs([]);

  return (
    <div className="mt-6 border p-4 bg-background shadow-md">
      <div className="flex items-center justify-between mb-3 sticky top-0 z-10 bg-background/80 backdrop-blur-xl py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Live Job Updates</h3>
        </div>

        <Button
          onClick={handleClear}
          className="text-sm px-3 py-1.5 rounded-md border transition cursor-pointer"
        >
          Clear
        </Button>
      </div>

      <ScrollArea className="h-72 border p-4 font-mono text-sm">
        {logs.length === 0 ? (
          <p className="opacity-60">Waiting for updates...</p>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "px-3 py-2 rounded-md border shadow-sm",
                    stageStyles[log.stage] || stageStyles.info
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
