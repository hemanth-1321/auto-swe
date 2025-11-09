"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import Repos from "./repos";
import { processRepo } from "@/app/action/processRepo";
import { toast } from "sonner";
import { JobUpdates } from "./JobUpdates";

export const Chat = () => {
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRepoSelect = (repo: string) => {
    setSelectedRepo(repo);
  };

  const handleProcess = async () => {
    if (!selectedRepo || !prompt.trim()) {
      toast.error("Please select a repository and enter a prompt");
      return;
    }

    setIsProcessing(true);

    const response = await processRepo(selectedRepo, prompt);

    if (response.success) {
      toast.success(`Processing started — Job ID: ${response.data.jobId}`);
      setJobId(response.data.jobId);
      setPrompt(""); // clear prompt for new input
    } else {
      toast.error(response.error || "Failed to start job");
    }

    setIsProcessing(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-20">
      <Card className="p-6 space-y-4 shadow-md rounded-2xl">
        <Repos onSelect={handleRepoSelect} />

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            selectedRepo
              ? `Chat about ${selectedRepo}...`
              : "Select a repository first..."
          }
          disabled={!selectedRepo || isProcessing}
          className="
            w-full
            min-h-[120px]
            p-4
            rounded-xl
            border border-gray-300
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            shadow-sm
            resize-none
            transition
            duration-200
            hover:shadow-md
          "
        />

        <Button
          disabled={!selectedRepo || !prompt.trim() || isProcessing}
          onClick={handleProcess}
          className="
            mt-3
            w-full
            font-semibold
            py-2
            rounded-xl
            shadow
            transition
            duration-200
          "
        >
          {isProcessing ? "Processing..." : "Send"}
        </Button>

        {jobId && <JobUpdates jobId={jobId} />}
      </Card>
    </div>
  );
};
