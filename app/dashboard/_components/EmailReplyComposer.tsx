"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Loader2, Send, X, Sparkles } from "lucide-react";
import { useState } from "react";
import { EditorToolbar } from "./editor-toolbar";
import { AutocompleteExtension } from "./extensions/autocomplete";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/hooks/use-toast";
import { Summary } from "../types";

interface EmailReplyComposerProps {
  onClose: () => void;
  inThread?: boolean;
  className?: string;
  threadId?: string;
  onSent?: () => void;
  summary?: Summary | null;
}

export function EmailReplyComposer({
  onClose,
  inThread,
  className,
  threadId,
  onSent,
  summary,
}: EmailReplyComposerProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: (): string => {
          return "Write your reply...";
        },
      }),
      AutocompleteExtension,
    ],
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
  }) as Editor | null;

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

  const handleGenerateReply = async () => {
    if (!summary || !editor) return;

    try {
      setIsGeneratingReply(true);

      const response = await fetch("/api/openai/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summary.summary,
          actionItems: summary.summary.action_items,
          keyDates: summary.summary.key_dates,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate reply");

      const { reply } = await response.json();

      // Clear existing content and insert the generated reply
      editor.commands.setContent(reply);

      toast({
        title: "Reply generated",
        description: "You can now edit the generated reply before sending",
      });
    } catch (error) {
      console.error("Error generating reply:", error);
      toast({
        title: "Error",
        description: "Failed to generate reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleSend = async () => {
    if (!editor?.getText() || !threadId) return;

    try {
      setIsSending(true);
      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          content: editor.getHTML(),
          type: "reply",
        }),
      });

      if (!response.ok) throw new Error("Failed to send email");

      toast({
        title: "Email sent",
        description: "Your reply has been sent successfully",
      });

      editor.commands.clearContent();

      onSent?.();
      onClose();
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className={cn(
        "bg-background border rounded-lg shadow-sm flex flex-col h-full",
        inThread ? "mx-0" : "mx-4 mb-4",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <h3 className="text-sm font-medium">Reply</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <EditorToolbar
          editor={editor}
          onSuggest={handleSuggest}
          isSuggestLoading={isSuggestLoading}
        />
        {summary && (
          <div className="px-4 py-2 border-b bg-muted/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateReply}
              disabled={isGeneratingReply}
              className="w-full gap-2"
            >
              {isGeneratingReply ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGeneratingReply
                ? "Generating reply..."
                : "Generate reply from summary"}
            </Button>
          </div>
        )}
        <div className="border-t flex-1 overflow-y-auto">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>

      <div className="border-t p-2 bg-muted/50 flex-shrink-0">
        <div className="flex items-center justify-end">
          <Button onClick={handleSend} disabled={isSending} className="gap-2">
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
  );
}
