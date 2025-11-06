"use client";
import { useSearchParams } from "next/navigation";
const page = () => {
  const searchParams = useSearchParams();
  const installationId = searchParams.get("installation_id");

  return (
    <div className="flex justify-center items-center h-screen">
      <div>{installationId}</div>
    </div>
  );
};

export default page;
