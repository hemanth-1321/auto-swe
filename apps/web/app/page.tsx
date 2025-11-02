"use client";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export default function Home() {
  const GITHUB_APP_NAME = "auto-swe";

  const handleInstall = () => {
    window.open(
      `https://github.com/apps/${GITHUB_APP_NAME}/installations/new`,
      "_blank"
    );
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <Button className="cursor-pointer" onClick={handleInstall}>
        <Github />
        Sign in with GitHub
      </Button>
    </div>
  );
}
