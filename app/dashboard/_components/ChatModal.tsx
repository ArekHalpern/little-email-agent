import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat, Message } from "ai/react";
import { useEffect } from "react";

export function ChatModal({
  emailId,
  isOpen,
  onClose,
}: {
  emailId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/openai/chat",
      body: {
        emailId,
      },
    });

  useEffect(() => {
    if (isOpen) {
      // Fetch chat history from your API
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="flex flex-col h-[600px] p-4">
        <div className="flex-1 overflow-y-auto space-y-4">
          {messages.map((message: Message, i: number) => (
            <div
              key={i}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            Send
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
