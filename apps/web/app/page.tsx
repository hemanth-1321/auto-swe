"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { Chat } from "@/components/Chat";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const GITHUB_APP_NAME = "auto-swe";

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);
  }, []);

  const handleInstall = () => {
    window.open(
      `https://github.com/apps/${GITHUB_APP_NAME}/installations/new`,
      "_blank"
    );
  };

  if (!token) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Button
          className="cursor-pointer text-lg px-6 py-3"
          onClick={handleInstall}
        >
          <Github className="mr-2 h-5 w-5" />
          Sign in with GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Chat />
    </div>
  );
}
