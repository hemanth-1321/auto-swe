"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Github,
  ArrowRight,
  Sparkles,
  GitPullRequest,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import HowItWorks from "@/components/HowItWorks";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const router = useRouter();
  const GITHUB_APP_NAME = "auto-swe";

  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      setToken(storedToken);
      setRedirecting(true);

      // Smooth redirect after a tiny delay
      setTimeout(() => {
        router.push("/chat");
      }, 600);
    }

    setMounted(true);
  }, [router]);

  const handleInstall = () => {
    window.open(
      `https://github.com/apps/${GITHUB_APP_NAME}/installations/new`,
      "_blank"
    );
  };

  if (!mounted) return null;

  // Smooth message before redirect
  if (redirecting) {
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        Redirecting you to chat…
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                className="space-y-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <motion.h1
                  className="text-5xl lg:text-6xl font-bold leading-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  AI Developer Agent for Your GitHub Repositories
                </motion.h1>
                <motion.p
                  className="text-xl text-muted-foreground leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  Connect your repo, describe what you want, and AutoSWE writes
                  code & opens PRs automatically. Let AI handle the heavy
                  lifting while you focus on what matters.
                </motion.p>
                <motion.div
                  className="flex flex-col sm:flex-row gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <Button
                    onClick={handleInstall}
                    className="bg-(--accent-purple) hover:bg-(--accent-purple)/90 text-white rounded-lg px-8 py-6 text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    <Github className="mr-2 h-5 w-5" />
                    Install GitHub App
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 rounded-lg px-8 py-6 text-lg hover:bg-muted hover:scale-105 transition-all"
                  >
                    View Docs
                  </Button>
                </motion.div>
              </motion.div>

              <motion.div
                className="relative"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div className="w-full flex justify-center">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    src="https://res.cloudinary.com/duskmp26u/video/upload/v1763443078/Screencast_from_2025-11-17_23-36-32_mtevwx.mp4"
                    className=" shadow-lg w-full max-w-3xl border border-neutral-800"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section>
          <HowItWorks />
        </section>
      </div>
    );
  }

  return null;
}
