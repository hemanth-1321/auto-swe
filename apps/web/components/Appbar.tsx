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
import ThemeToggle from "./ThemeToggle";
import { getUser } from "@/app/action/user";

export function AppBar() {
  const router = useRouter();
  const [user, setUser] = useState<{
    username: string;
    avatarUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const fetchedUser = await getUser();
        setUser(fetchedUser);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUser();
  }, []);

  if (!user) return null;

  return (
    <div className="bg-black">
      <header className="fixed top-0 z-50 w-full p-2 h-[72px]">
        <div className="h-full mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 rounded-2xl bg-background border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold font-mono text-xl">Auto-Swe</span>
          </Link>

          {/* Right side: theme toggle + profile */}
          <div className="flex items-center gap-4">
            <ThemeToggle />

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
          </div>
        </div>
      </header>
    </div>
  );
}
