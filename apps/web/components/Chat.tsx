"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import Repos from "./repos";
import { processRepo } from "@/app/action/processRepo";
import { toast } from "sonner";
import { JobUpdates } from "./JobUpdates";
import { Plus, Play, Terminal, GitBranch, Sparkles } from "lucide-react";

export const Chat = () => {
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const APP_SLUG = "auto-swe";

  const handleRepoSelect = (repo: string) => setSelectedRepo(repo);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleProcess = async () => {
    if (!selectedRepo || !prompt.trim()) {
      toast.error("Please select a repository and enter a prompt");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await processRepo(selectedRepo, prompt);

      if (response.success) {
        toast.success("Job started successfully");
        setJobId(response.data.jobId);
        setPrompt("");
      } else {
        toast.error(response.error || "Failed to start job");
      }
    } catch {
      toast.error("Unexpected error occurred");
    }

    setIsProcessing(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* UPDATED LAYOUT:
        h-auto for mobile (allows stacking), lg:h-[550px] for desktop (fixed height).
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[550px]">
        {/* LEFT PANEL: Configuration 
          h-auto for mobile (natural height), lg:h-full for desktop (fill grid).
        */}
        <Card className="flex flex-col p-1 shadow-md h-auto lg:h-full border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="p-5 flex-1 flex flex-col gap-6 min-h-0">
            {/* Repo Select Section */}
            <div className="space-y-3 flex-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                  <GitBranch className="w-4 h-4 text-primary" />
                  Target Repository
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `https://github.com/apps/${APP_SLUG}/installations/new`,
                      "_blank"
                    )
                  }
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Repositories
                </Button>
              </div>

              <div className="border border-input/50 rounded-xl p-2 bg-background/50 shadow-sm focus-within:ring-2 focus-within:ring-ring/20 transition-all">
                <Repos onSelect={handleRepoSelect} />
              </div>
            </div>

            {/* Prompt Input Section */}
            <div className="space-y-3 flex flex-col flex-1 min-h-[200px] lg:min-h-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                <Sparkles className="w-4 h-4 text-primary" />
                Task Instructions
              </div>

              <Textarea
                value={prompt}
                onChange={handlePromptChange}
                placeholder={
                  selectedRepo
                    ? `Describe the bug fix or feature for ${selectedRepo}...\nExample: "Fix the navigation bar responsive issue on mobile devices."`
                    : "Select a repository above to enable the editor..."
                }
                disabled={!selectedRepo || isProcessing}
                className="flex-1 resize-none p-4 text-base leading-relaxed focus-visible:ring-1 bg-muted/20 border-input/50 font-mono"
              />
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-5 pt-2 mt-auto flex-none bg-linear-to-t from-background/50 to-transparent">
            <Button
              disabled={!selectedRepo || !prompt.trim() || isProcessing}
              onClick={handleProcess}
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/10 hover:shadow-primary/25 transition-all active:scale-[0.98] bg-linear-to-r from-primary to-primary/90"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2 animate-pulse">
                  Processing Request...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-4 h-4 fill-current" /> Start Workflow
                </span>
              )}
            </Button>
          </div>
        </Card>

        {/* RIGHT PANEL: Job Output 
           h-[500px] for mobile (gives terminal enough space to scroll), lg:h-full for desktop.
        */}
        <Card className="flex flex-col h-[500px] lg:h-full shadow-md border-border/60 overflow-hidden relative group">
          <div className="flex-1 overflow-hidden relative p-0">
            {!jobId && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 gap-2 select-none">
                <Terminal className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">
                  Waiting for job to start...
                </p>
              </div>
            )}
            <JobUpdates jobId={jobId} />
          </div>
        </Card>
      </div>
    </div>
  );
};
