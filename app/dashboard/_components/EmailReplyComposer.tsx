"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Loader2, Send, X } from "lucide-react";
import { useState } from "react";
import { EditorToolbar } from "./editor-toolbar";
import { AutocompleteExtension } from "./extensions/autocomplete";
import { cn } from "@/lib/utils";

interface EmailReplyComposerProps {
  onClose: () => void;
  inThread?: boolean;
  className?: string;
}

export function EmailReplyComposer({
  onClose,
  inThread,
  className,
}: EmailReplyComposerProps) {
  const [isSending, setIsSending] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);

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

  const handleSend = async () => {
    if (!editor?.getText()) return;

    try {
      setIsSending(true);
      // TODO: Implement send functionality
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onClose();
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className={cn(
        "bg-background border rounded-lg shadow-sm flex flex-col",
        inThread ? "mx-0" : "mx-4 mb-4",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b">
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

      <div className="flex-1 flex flex-col min-h-[400px]">
        <EditorToolbar
          editor={editor}
          onSuggest={handleSuggest}
          isSuggestLoading={isSuggestLoading}
        />
        <div className="border-t flex-1 flex flex-col">
          <EditorContent editor={editor} className="flex-1" />
        </div>
      </div>

      <div className="border-t p-2 bg-muted/50">
        <div className="flex items-center justify-between">
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
