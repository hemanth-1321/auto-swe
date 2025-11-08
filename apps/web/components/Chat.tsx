import { Textarea } from "@/components/ui/textarea";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export const Chat = () => {
  return (
    <div className="w-full max-w-3xl mx-auto mt-30">
      <Card className="p-6 space-y-4">
        <div>card</div>
        <Textarea
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
        <Button
          className="
          mt-3
          w-full
          font-semibold
          py-2
          rounded-xl
          shadow
          transition
          duration-200
        "
        >
          Send
        </Button>
      </Card>
    </div>
  );
};
