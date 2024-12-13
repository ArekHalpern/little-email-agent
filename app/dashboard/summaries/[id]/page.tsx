"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmailViewModal } from "../../_components/EmailViewModal";
import { Email, EmailThread } from "../../types";
import { Badge } from "@/components/ui/badge";

interface EmailSummaryData {
  main_points: string[];
  action_items: string[];
  key_dates: Array<{
    date: string;
    description: string;
  }>;
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
  participants: string[];
  important_links?: string[];
  attachments_summary?: string[];
}

interface Summary {
  id: string;
  emailId: string;
  summary: EmailSummaryData;
  checkedActionItems: string[];
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
  const [editedSummary, setEditedSummary] = useState<EmailSummaryData | null>(
    null
  );
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
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch email details
        const emailResponse = await fetch(`/api/gmail/messages/${emailId}`);
        if (!emailResponse.ok) throw new Error("Failed to fetch email");
        const emailData = await emailResponse.json();

        const emailDetails: Email = {
          id: emailData.email.id,
          subject:
            emailData.email.payload.headers.find(
              (h: { name: string; value: string }) =>
                h.name.toLowerCase() === "subject"
            )?.value || "No Subject",
          from:
            emailData.email.payload.headers.find(
              (h: { name: string; value: string }) =>
                h.name.toLowerCase() === "from"
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
          setEditedSummary(summaryData?.summary || null);
          setCheckedItems(summaryData?.checkedActionItems || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [emailId]);

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
    async (resultOrEvent?: React.MouseEvent | EmailSummaryData) => {
      try {
        setIsSaving(true);
        setError(null);

        const summaryToSave =
          resultOrEvent && !("type" in resultOrEvent)
            ? resultOrEvent
            : editedSummary;

        if (!summaryToSave) {
          throw new Error("No summary data to save");
        }

        const response = await fetch("/api/email-summaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailId,
            summary: summaryToSave,
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
    if (!selectedPromptId || !email) return;

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch("/api/openai/custom-email-sythesizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailContent: email,
          promptId: selectedPromptId,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate summary");

      const { result } = await response.json();
      setEditedSummary(result);

      // Save the generated summary
      await handleSaveSummary(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate summary"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [selectedPromptId, email, handleSaveSummary]);

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

  const handleCheckItem = async (item: string) => {
    try {
      // Store the previous state for rollback
      const previousItems = [...checkedItems];

      // Optimistically update the UI
      const newCheckedItems = checkedItems.includes(item)
        ? checkedItems.filter((i) => i !== item)
        : [...checkedItems, item];

      setCheckedItems(newCheckedItems);

      const response = await fetch("/api/email-summaries/checked-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId,
          checkedItems: newCheckedItems,
        }),
      });

      if (!response.ok) {
        // If the server request fails, revert to previous state
        setCheckedItems(previousItems);
        const error = await response.json();
        throw new Error(error.message || "Failed to update checked items");
      }

      // Update the summary state to reflect the new checkedItems
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              checkedActionItems: newCheckedItems,
            }
          : null
      );
    } catch (err) {
      console.error("Failed to update checked items:", err);
      // Error is already handled above with state reversion
    }
  };

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
    <div className="container mx-auto p-4 space-y-4 max-w-4xl">
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <h2 className="text-lg font-medium leading-none break-words">
                {email?.subject}
              </h2>
              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 text-sm text-muted-foreground">
                <span className="truncate">{email?.from}</span>
                <span className="hidden sm:inline">·</span>
                <span className="truncate">
                  {email?.internalDate
                    ? new Date(parseInt(email.internalDate)).toLocaleString()
                    : "Unknown date"}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => email && handleViewEmail(email)}
              className="shrink-0"
            >
              <Mail className="w-4 h-4 mr-2" />
              View Email
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Email Analysis</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={selectedPromptId}
                onValueChange={setSelectedPromptId}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
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
                className="flex-1 sm:flex-none"
              >
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Summary</h3>
                <Textarea
                  value={editedSummary?.summary || ""}
                  onChange={(e) =>
                    setEditedSummary((prev) =>
                      prev ? { ...prev, summary: e.target.value } : null
                    )
                  }
                  className="min-h-[100px]"
                  placeholder="Enter summary..."
                />
              </div>
              <div>
                <h3 className="font-medium mb-2">Main Points</h3>
                <Textarea
                  value={editedSummary?.main_points?.join("\n") || ""}
                  onChange={(e) =>
                    setEditedSummary((prev) =>
                      prev
                        ? {
                            ...prev,
                            main_points: e.target.value
                              .split("\n")
                              .filter(Boolean),
                          }
                        : null
                    )
                  }
                  className="min-h-[100px]"
                  placeholder="Enter main points (one per line)..."
                />
              </div>
              <div>
                <h3 className="font-medium mb-2">Action Items</h3>
                <Textarea
                  value={editedSummary?.action_items?.join("\n") || ""}
                  onChange={(e) =>
                    setEditedSummary((prev) =>
                      prev
                        ? {
                            ...prev,
                            action_items: e.target.value
                              .split("\n")
                              .filter(Boolean),
                          }
                        : null
                    )
                  }
                  className="min-h-[100px]"
                  placeholder="Enter action items and next steps (one per line)..."
                />
              </div>
              <Button onClick={handleSaveSummary} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditedSummary(summary?.summary || null);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : summary ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Generated Summary</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="shrink-0"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Summary
                </Button>
              </div>
              <div className="space-y-6">
                {summary.summary && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge
                        variant={
                          summary.summary.sentiment === "positive"
                            ? "success"
                            : summary.summary.sentiment === "negative"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {summary.summary.sentiment}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {summary.summary.summary}
                    </p>
                  </div>
                )}

                {summary.summary?.main_points?.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Main Points</h3>
                    <ul className="list-disc pl-4 space-y-1">
                      {summary.summary.main_points.map(
                        (point: string, i: number) => (
                          <li key={i}>{point}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {summary.summary?.action_items?.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Action Items</h3>
                    <ul className="space-y-1">
                      {summary.summary.action_items.map(
                        (item: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={checkedItems.includes(item)}
                              onChange={() => handleCheckItem(item)}
                            />
                            <span>{item}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {summary.summary?.key_dates &&
                  summary.summary.key_dates.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Key Dates</h3>
                      <div className="space-y-2">
                        {summary.summary.key_dates.map((date, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Badge variant="outline">{date.date}</Badge>
                            <span>{date.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {summary.summary?.important_links &&
                  summary.summary.important_links.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Important Links</h3>
                      <ul className="space-y-1">
                        {summary.summary.important_links.map((link, i) => (
                          <li key={i} className="break-all">
                            <a
                              href={link}
                              className="text-blue-500 hover:underline inline-block max-w-full"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Select a template and click Generate to analyze this email
            </div>
          )}
        </CardContent>
      </Card>

      <EmailViewModal
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        email={selectedEmail?.email || null}
        thread={selectedEmail?.thread}
      />
    </div>
  );
}
