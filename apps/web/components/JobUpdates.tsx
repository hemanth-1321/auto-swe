"use client";
import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/lib/constants";

interface JobUpdatesProps {
  jobId: string;
}

export const JobUpdates = ({ jobId }: JobUpdatesProps) => {
  const [status, setStatus] = useState<string>("Waiting for job...");

  useEffect(() => {
    if (!jobId) return;

    setStatus("Loading job status...");

    const eventSource = new EventSource(
      `${BACKEND_URL}/publish/updates/${jobId}`
    );

    eventSource.addEventListener("status", (event: any) => {
      const data = JSON.parse(event.data);
      let text = "";

      switch (data.status) {
        case "waiting":
        case "pending":
          text = "Job is queued...";
          break;
        case "active":
          text = "Job started running...";
          break;
        case "completed":
          text = "Job completed successfully ✔";
          break;
        case "failed":
          text = `Job failed ❌ - ${data.reason}`;
          break;
        case "not_found":
          text = "Job not found";
          break;
        default:
          text = data.status;
      }

      setStatus(text);
    });

    eventSource.onerror = () => eventSource.close();

    return () => eventSource.close();
  }, [jobId]);

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
        Job Status
      </h3>

      <div className="bg-black text-green-400 font-mono text-sm rounded-lg p-4 h-28 flex items-center border border-green-500/40 shadow-inner">
        <p className="whitespace-pre-wrap">{status}</p>
      </div>
    </div>
  );
};
