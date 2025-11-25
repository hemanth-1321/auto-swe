import { Chat } from "@/components/Chat";
import React from "react";

const page = () => {
  return (
    <div className="min-h-screen w-full bg-background selection:bg-primary/20 mt-5">
      <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-slate-950 [background:radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:[background:radial-gradient(#1e293b_1px,transparent_1px)]"></div>

      <div className="flex justify-center items-center min-h-screen py-10">
        <Chat />
      </div>
    </div>
  );
};

export default page;
