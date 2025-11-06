import { Textarea } from "@/components/ui/textarea";

export const Chat = () => {
  return (
    <div className="w-full max-w-md mx-auto mt-10">
      <Textarea
        id="chat"
        placeholder="Type your message here..."
        className="
          w-full
          min-h-[120px]
          p-4
          rounded-xl
          border border-gray-300
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          shadow-sm
          resize-none
          transition
          duration-200
          hover:shadow-md
          "
      />
      <button
        className="
          mt-3
          w-full
          bg-blue-500
          text-white
          font-semibold
          py-2
          rounded-xl
          shadow
          hover:bg-blue-600
          transition
          duration-200
        "
      >
        Send
      </button>
    </div>
  );
};
