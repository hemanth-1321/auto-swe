"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { auth } from "../action/user";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const installationId = searchParams.get("installation_id");

  useEffect(() => {
    if (!installationId) {
      router.replace("/");
      return;
    }

    const loginUser = async () => {
      try {
        const user = await auth(Number(installationId));
        console.log("Authenticated as:", user.username);
        router.replace("/");
      } catch (err) {
        console.error(err);
        router.replace("/");
      }
    };

    loginUser();
  }, [installationId, router]);

  return (
    <div className="flex justify-center items-center h-screen">
      Logging in...
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          Loading...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
