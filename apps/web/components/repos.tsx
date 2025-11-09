"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ReposProps {
  onSelect?: (repo: string) => void;
}

export default function Repos({ onSelect }: ReposProps) {
  const [repos, setRepos] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(`${BACKEND_URL}/get/repos`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const repoNames = res.data?.payload?.repository_full_names || [];
        setRepos(repoNames);
      } catch (error) {
        console.error("Error fetching repos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

  const handleSelect = (value: string) => {
    setSelectedRepo(value);
    onSelect?.(value);
  };

  return (
    <div className="flex flex-col  items-start gap-2">
      <label className="text-sm font-medium text-muted-foreground">
        Select Repository
      </label>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="animate-spin w-4 h-4" />
          <span>Loading...</span>
        </div>
      ) : repos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No repositories found.</p>
      ) : (
        <Select value={selectedRepo} onValueChange={handleSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a repository" />
          </SelectTrigger>
          <SelectContent>
            {repos.map((repo) => (
              <SelectItem key={repo} value={repo}>
                {repo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
