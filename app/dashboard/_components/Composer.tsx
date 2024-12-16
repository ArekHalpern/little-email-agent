"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Minimize2, Maximize2, X } from "lucide-react";
import { Email } from "@/app/dashboard/types";
import { emailCache, EmailCacheData } from "@/lib/cache";
import { EditorToolbar } from "./editor-toolbar";
import { cn } from "@/lib/utils";
import { AutocompleteExtension } from "./extensions/autocomplete";
import { useToast } from "@/lib/hooks/use-toast";

interface ComposerProps {
  emailId: string | null; // null for new email, string for reply
  onClose: () => void;
}

export function Composer({ emailId, onClose }: ComposerProps) {
  const { toast } = useToast();
  const [originalEmail, setOriginalEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientError, setRecipientError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: (): string => {
          return "Write your message...";
        },
      }),
      AutocompleteExtension,
    ],
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  }) as Editor | null;

  useEffect(() => {
    const fetchEmail = async () => {
      if (!emailId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const cacheKey = `email:${emailId}`;
        const cachedData = emailCache.get(cacheKey) as EmailCacheData;

        if (cachedData?.email) {
          setOriginalEmail(cachedData.email);
          return;
        }

        const response = await fetch(`/api/gmail/messages/${emailId}`);
        if (!response.ok) throw new Error("Failed to fetch email");
        const data = await response.json();
        setOriginalEmail(data.email);
        emailCache.set(cacheKey, { email: data.email });
      } catch (error) {
        console.error("Error fetching email:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmail();
  }, [emailId]);

  const handleSuggest = async () => {
    if (!editor?.getText() || !editor.isEditable) return;

    try {
      setIsSuggestLoading(true);
      const response = await fetch("/api/openai/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: editor.getText() }),
      });

      if (!response.ok) throw new Error("Failed to get suggestion");

      const { completion } = await response.json();

      if (completion) {
        const currentPos = editor.state.selection.$head.pos;
        editor.chain().focus().insertContent(completion).run();

        editor.commands.setTextSelection(currentPos);
      }
    } catch (error) {
      console.error("Autocomplete error:", error);
    } finally {
      setIsSuggestLoading(false);
    }
  };

  const handleSend = async () => {
    if (!editor?.getText() || !recipient || recipientError) return;

    try {
      setIsSending(true);
      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject,
          content: editor.getHTML(),
          type: emailId ? "reply" : "new",
          threadId: emailId || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to send email");

      toast({
        title: "Email sent",
        description: "Your email has been sent successfully",
      });
      onClose();
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  return (
    <div
      className={cn(
        "fixed transition-all duration-200 ease-in-out shadow-2xl z-50",
        isMinimized
          ? "bottom-0 right-4 w-[300px] h-[48px] rounded-t-lg"
          : isMaximized
          ? "bottom-0 right-0 w-full h-screen"
          : "bottom-0 right-4 w-[600px] h-[600px] rounded-t-lg",
        "bg-background border flex flex-col"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <h2 className="font-medium text-sm">
          {emailId ? `Reply: ${originalEmail?.subject}` : "New Message"}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Recipients and Subject */}
              <div className="space-y-3 px-4 py-3 border-b">
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="w-16 flex-shrink-0 font-medium text-muted-foreground">
                    To:
                  </span>
                  <input
                    type="email"
                    placeholder="Enter recipient email"
                    value={recipient}
                    onChange={(e) => {
                      setRecipient(e.target.value);
                      if (e.target.value && !validateEmail(e.target.value)) {
                        setRecipientError("Please enter a valid email address");
                      } else {
                        setRecipientError(null);
                      }
                    }}
                    className={cn(
                      "w-full bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/50",
                      recipientError && "text-destructive"
                    )}
                  />
                </div>
                {recipientError && (
                  <span className="text-xs text-destructive mt-1">
                    {recipientError}
                  </span>
                )}
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="w-16 flex-shrink-0 font-medium text-muted-foreground">
                    Subject:
                  </span>
                  <input
                    type="text"
                    placeholder="Enter subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 overflow-auto">
                <EditorToolbar
                  editor={editor}
                  onSuggest={handleSuggest}
                  isSuggestLoading={isSuggestLoading}
                />
                <div className="border-t">
                  <EditorContent editor={editor} />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t p-2 bg-muted/50">
                <div className="flex items-center justify-end">
                  <Button
                    onClick={handleSend}
                    disabled={isSending}
                    className="gap-2"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
