"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import Repos from "./repos";
import { processRepo } from "@/app/action/processRepo";
import { toast } from "sonner";
import { JobUpdates } from "./JobUpdates";
import { Plus } from "lucide-react";

export const Chat = () => {
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const APP_SLUG = "auto-swe";

  const handleProcess = async () => {
    if (!selectedRepo || !prompt.trim()) {
      toast.error("Please select a repository and enter a prompt");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await processRepo(selectedRepo, prompt);

      if (response.success) {
        toast.success(`Processing started — Job ID: ${response.data.jobId}`);
        setJobId(response.data.jobId);
        setPrompt("");
      } else {
        toast.error(response.error || "Failed to start job");
      }
    } catch {
      toast.error("Unexpected error");
    }

    setIsProcessing(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL */}
        <Card className="p-6 shadow-md h-[680px] flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <div className="flex-1">
              <Repos onSelect={(repo) => setSelectedRepo(repo)} />
            </div>

            <Button
              onClick={() =>
                window.open(
                  `https://github.com/apps/${APP_SLUG}/installations/new`,
                  "_blank"
                )
              }
              className="mt-4 sm:mt-0 flex gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Add Repositories
            </Button>
          </div>

          <Textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (jobId) setJobId(null);
            }}
            placeholder={
              selectedRepo
                ? `Chat about ${selectedRepo}...`
                : "Select a repository first..."
            }
            disabled={!selectedRepo || isProcessing}
            className="mt-4 min-h-[150px] resize-none"
          />

          <Button
            disabled={!selectedRepo || !prompt.trim() || isProcessing}
            onClick={handleProcess}
            className="mt-4 w-full h-11 text-base font-medium cursor-pointer"
          >
            {isProcessing ? "Processing..." : "Send"}
          </Button>
        </Card>

        {/* RIGHT PANEL */}
        <Card className="p-4 shadow-md h-[680px] flex flex-col overflow-hidden">
          <JobUpdates jobId={jobId} />
        </Card>
      </div>
    </div>
  );
};
