"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface EmailHeader {
  name: string;
  value: string;
}

interface Email {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  threadId?: string;
  internalDate?: string;
  payload?: {
    headers: EmailHeader[];
    parts?: {
      mimeType: string;
      body: {
        data?: string;
      };
    }[];
    body?: {
      data?: string;
    };
  };
}

interface EmailThread {
  messages: Email[];
}

interface Summary {
  id: string;
  emailId: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

interface EmailPrompt {
  id: string;
  name: string;
  prompt: string;
}

export default function SummaryPage() {
  const params = useParams();
  const emailId = params.id as string;

  const [email, setEmail] = useState<Email | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<EmailPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<{
    email: Email;
    thread?: EmailThread;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch email details
        const emailResponse = await fetch(`/api/gmail/messages/${emailId}`);
        if (!emailResponse.ok) throw new Error("Failed to fetch email");
        const emailData = await emailResponse.json();

        const emailDetails = {
          id: emailData.email.id,
          subject:
            emailData.email.payload.headers.find(
              (h: EmailHeader) => h.name.toLowerCase() === "subject"
            )?.value || "No Subject",
          from:
            emailData.email.payload.headers.find(
              (h: EmailHeader) => h.name.toLowerCase() === "from"
            )?.value || "Unknown Sender",
          snippet: emailData.email.snippet,
          threadId: emailData.email.threadId,
          internalDate: emailData.email.internalDate,
          payload: emailData.email.payload,
        };
        setEmail(emailDetails);

        // Fetch summary if it exists
        const summaryResponse = await fetch(
          `/api/email-summaries?emailId=${emailId}`
        );
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          setSummary(summaryData);
          setEditedSummary(summaryData?.summary || "");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [emailId]);

  const handleViewEmail = async (email: Email) => {
    setSelectedEmail({ email });

    // Fetch thread if it exists
    if (email.threadId) {
      try {
        const response = await fetch(`/api/gmail/messages/${email.threadId}`);
        if (!response.ok) throw new Error("Failed to fetch thread");
        const data = await response.json();
        setSelectedEmail((prev) => ({
          ...prev!,
          thread: data.thread,
        }));
      } catch (error) {
        console.error("Error fetching thread:", error);
      }
    }
  };

  const decodeEmailBody = (email: Email) => {
    const htmlPart = email.payload?.parts?.find(
      (part) => part.mimeType === "text/html"
    );
    const plainPart = email.payload?.parts?.find(
      (part) => part.mimeType === "text/plain"
    );

    const body =
      htmlPart?.body?.data ||
      plainPart?.body?.data ||
      email.payload?.body?.data;

    if (!body) return "";

    const decoded = decodeURIComponent(
      escape(atob(body.replace(/-/g, "+").replace(/_/g, "/")))
    );

    if (!htmlPart && plainPart) {
      return decoded.replace(/\n/g, "<br>");
    }

    return decoded;
  };

  useEffect(() => {
    const fetchPrompts = async () => {
      const response = await fetch("/api/email-prompts");
      if (response.ok) {
        const data = await response.json();
        setPrompts(data);
      }
    };
    fetchPrompts();
  }, []);

  const handleSaveSummary = useCallback(
    async (summaryText?: string) => {
      try {
        setIsSaving(true);
        setError(null);

        const response = await fetch("/api/email-summaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailId,
            summary: summaryText || editedSummary,
          }),
        });

        if (!response.ok) throw new Error("Failed to save summary");

        const updatedSummary = await response.json();
        setSummary(updatedSummary);
        setIsEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save summary");
      } finally {
        setIsSaving(false);
      }
    },
    [emailId, editedSummary]
  );

  const generateSummary = useCallback(async () => {
    if (!selectedPromptId || !email?.snippet) return;

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch("/api/openai/custom-email-sythesizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailContent: email.snippet,
          promptId: selectedPromptId,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate summary");

      const { result } = await response.json();
      setEditedSummary(result);

      // Immediately save the generated summary
      await handleSaveSummary(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate summary"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [selectedPromptId, email?.snippet, handleSaveSummary]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <Card className="p-4">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium leading-none">
              {email?.subject}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="-mr-2"
              onClick={() => email && handleViewEmail(email)}
            >
              View
            </Button>
          </div>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>{email?.from}</span>
            <span>·</span>
            <span>
              {email?.internalDate
                ? new Date(parseInt(email.internalDate)).toLocaleString()
                : "Unknown date"}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Summary</CardTitle>
          <div className="flex gap-2">
            <Select
              value={selectedPromptId}
              onValueChange={setSelectedPromptId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {prompts.map((prompt) => (
                  <SelectItem key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={generateSummary}
              disabled={isGenerating || !selectedPromptId}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (isEditing) {
                  setEditedSummary(summary?.summary || "");
                }
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                className="min-h-[200px]"
                placeholder="Enter your summary..."
              />
              <Button onClick={() => handleSaveSummary()} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">
              {summary?.summary || "No summary available yet"}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedEmail}
        onOpenChange={() => setSelectedEmail(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 z-50 flex flex-col gap-1.5 bg-background pb-4">
            <DialogHeader>
              <DialogTitle>{selectedEmail && email?.subject}</DialogTitle>
            </DialogHeader>
          </div>

          {selectedEmail?.thread ? (
            <div className="space-y-6">
              {selectedEmail.thread.messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "border-b pb-6",
                    index === selectedEmail.thread!.messages.length - 1 &&
                      "border-b-0"
                  )}
                >
                  <div className="mb-2 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">
                        {
                          message.payload?.headers.find(
                            (h) => h.name.toLowerCase() === "from"
                          )?.value
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          parseInt(message.internalDate || "0")
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert email-content"
                    dangerouslySetInnerHTML={{
                      __html: decodeEmailBody(message),
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            selectedEmail && (
              <div
                className="prose prose-sm max-w-none dark:prose-invert email-content"
                dangerouslySetInnerHTML={{
                  __html: decodeEmailBody(selectedEmail.email),
                }}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
