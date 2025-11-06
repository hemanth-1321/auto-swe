"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "../action/user";
const Page = () => {
  const searchParams = useSearchParams();
  const installationId = searchParams.get("installation_id");

  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!installationId) return;

    const loginUser = async () => {
      try {
        setLoading(true);
        const user = await auth(Number(installationId));

        setUsername(user.username);
        alert(`Logged in as ${user.username}`);
      } catch (err) {
        console.error(err);
        alert("Failed to authenticate user");
      } finally {
        setLoading(false);
      }
    };

    loginUser();
  }, [installationId]);

  return (
    <div className="flex flex-col justify-center items-center h-screen">
      {loading ? (
        <div>Loading...</div>
      ) : username ? (
        <div>Welcome, {username}!</div>
      ) : (
        <div>No installation ID found in URL</div>
      )}
    </div>
  );
};

export default Page;
