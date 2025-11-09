"use client";

import { useEffect, useState, useRef } from "react";
import { Terminal } from "lucide-react";
import { BACKEND_URL } from "@/lib/constants";

interface JobUpdatesProps {
  jobId: string;
}

export const JobUpdates = ({ jobId }: JobUpdatesProps) => {
  const [messages, setMessages] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(
      `${BACKEND_URL}/publish/updates/${jobId}`
    );

    eventSource.onmessage = (event) => {
      let message = "";

      try {
        const parsed = JSON.parse(event.data);
        message = parsed.message || "";
      } catch {
        message = event.data;
      }

      if (message) {
        setMessages((prev) => [...prev, message]);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleClear = () => setMessages([]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Live Job Updates
          </h3>
        </div>
        <button
          onClick={handleClear}
          className="text-sm px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
        >
          Clear Terminal
        </button>
      </div>

      <div
        className="
          bg-black
          text-green-400
          font-mono
          text-sm
          rounded-lg
          p-4
          h-64
          overflow-y-auto
          border
          border-green-500/40
          shadow-inner
        "
      >
        {messages.length === 0 ? (
          <p className="text-green-700 animate-pulse">Waiting for updates...</p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="whitespace-pre-wrap">
              <span className="text-green-500">$</span> {msg}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
