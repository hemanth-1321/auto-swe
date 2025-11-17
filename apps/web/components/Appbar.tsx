"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Github } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { getUser } from "@/app/action/user";

export function AppBar() {
  const router = useRouter();
  const [user, setUser] = useState<{
    username: string;
    avatarUrl?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const GITHUB_APP_NAME = "auto-swe";

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const fetchedUser = await getUser();
        setUser(fetchedUser);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleInstall = () => {
    window.open(
      `https://github.com/apps/${GITHUB_APP_NAME}/installations/new`,
      "_blank"
    );
  };

  // Don't render anything while checking auth state
  if (loading) {
    return (
      <div className="bg-black">
        <header className="fixed top-0 z-50 w-full p-2 h-[72px]">
          <div className="h-full mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 rounded-2xl bg-background border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold font-mono text-xl">Auto-Swe</span>
            </Link>
            <div className="w-10 h-10 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="bg-black">
      <header className="fixed top-0 z-50 w-full p-2 h-[72px]">
        <div className="h-full mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 rounded-2xl bg-background border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold font-mono text-xl">Auto-Swe</span>
          </Link>

          {/* Right side: theme toggle + profile or sign in */}
          <div className="flex items-center gap-4">
            <ThemeToggle />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="cursor-pointer">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback>{user.username[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="w-56"
                  align="end"
                  sideOffset={0}
                  style={{ transition: "none" }}
                >
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback>{user.username[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold">{user.username}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={handleInstall}
                size="sm"
                className="flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
