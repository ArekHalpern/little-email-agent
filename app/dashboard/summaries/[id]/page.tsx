"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Pencil, ArrowLeft } from "lucide-react";
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
import { emailCache, EmailCacheData } from "@/lib/cache";
import type { Summary, EmailSummaryData } from "../../types";

interface EmailPrompt {
  id: string;
  name: string;
  prompt: string;
}

export default function SummaryPage() {
  const params = useParams();
  const router = useRouter();
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

        // Check cache first
        const cacheKey = `summary:${emailId}`;
        const cachedData = emailCache.get(cacheKey) as EmailCacheData;

        if (cachedData?.email && cachedData?.summary) {
          setEmail(cachedData.email);
          setSummary(cachedData.summary);
          setEditedSummary(cachedData.summary.summary || null);
          setCheckedItems(cachedData.summary.checkedActionItems || []);
          setIsLoading(false);
          return;
        }

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

          // Cache the data
          emailCache.set(cacheKey, {
            email: emailDetails,
            summary: summaryData,
          });
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

        // Update cache with new summary
        const cacheKey = `summary:${emailId}`;
        const cachedData = emailCache.get(cacheKey) as EmailCacheData;
        if (cachedData?.email) {
          emailCache.set(cacheKey, {
            ...cachedData,
            summary: updatedSummary,
          });
        }

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
      const previousItems = [...checkedItems];
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
        setCheckedItems(previousItems);
        const error = await response.json();
        throw new Error(error.message || "Failed to update checked items");
      }

      // Update summary state
      setSummary((prev: Summary | null) =>
        prev
          ? {
              ...prev,
              checkedActionItems: newCheckedItems,
            }
          : null
      );

      // Update cache
      const cacheKey = `summary:${emailId}`;
      const cachedData = emailCache.get(cacheKey) as EmailCacheData;
      if (cachedData?.email && cachedData?.summary) {
        emailCache.set(cacheKey, {
          ...cachedData,
          summary: {
            ...cachedData.summary,
            checkedActionItems: newCheckedItems,
          },
        });
      }
    } catch (err) {
      console.error("Failed to update checked items:", err);
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
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inbox
          </Button>
        </div>

        {/* Email Preview Card */}
        <Card className="border-none shadow-md bg-card">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold leading-tight break-words">
                  {email?.subject}
                </h2>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span>{email?.from}</span>
                  <span>
                    {email?.internalDate
                      ? new Date(parseInt(email.internalDate)).toLocaleString()
                      : "Unknown date"}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => email && handleViewEmail(email)}
                className="w-full gap-2"
              >
                <Mail className="h-4 w-4" />
                View Original Email
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Section */}
        <div className="grid gap-6">
          <Card className="border-none shadow-md">
            <CardHeader className="space-y-4 p-6 pb-0">
              <div className="space-y-4">
                <CardTitle className="text-xl">Email Analysis</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Select
                      value={selectedPromptId}
                      onValueChange={setSelectedPromptId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select analysis template" />
                      </SelectTrigger>
                      <SelectContent>
                        {prompts.map((prompt) => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            {prompt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={generateSummary}
                    disabled={isGenerating || !selectedPromptId}
                    className="min-w-[120px]"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze"
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {isEditing ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2 text-sm sm:text-base">
                      Summary
                    </h3>
                    <Textarea
                      value={editedSummary?.summary || ""}
                      onChange={(e) =>
                        setEditedSummary((prev: EmailSummaryData | null) =>
                          prev ? { ...prev, summary: e.target.value } : null
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const target = e.target as HTMLTextAreaElement;
                          const value = target.value;
                          const selectionStart = target.selectionStart;
                          const newValue =
                            value.slice(0, selectionStart) +
                            "\n" +
                            value.slice(target.selectionEnd);
                          setEditedSummary((prev: EmailSummaryData | null) =>
                            prev ? { ...prev, summary: newValue } : null
                          );
                          // Set cursor position after update
                          setTimeout(() => {
                            target.selectionStart = target.selectionEnd =
                              selectionStart + 1;
                          }, 0);
                        }
                      }}
                      className="min-h-[120px] text-base leading-normal whitespace-pre-wrap"
                      placeholder="Enter summary..."
                    />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2 text-sm sm:text-base">
                      Main Points
                    </h3>
                    <Textarea
                      value={editedSummary?.main_points?.join("\n") || ""}
                      onChange={(e) =>
                        setEditedSummary((prev: EmailSummaryData | null) =>
                          prev
                            ? {
                                ...prev,
                                main_points: e.target.value.split("\n"),
                              }
                            : null
                        )
                      }
                      className="min-h-[120px] text-base leading-normal whitespace-pre-wrap"
                      placeholder="Enter main points (press Enter for new point)..."
                    />
                  </div>
                  <div>
                    <h3 className="font-medium mb-2 text-sm sm:text-base">
                      Action Items
                    </h3>
                    <div className="space-y-2">
                      {editedSummary?.action_items?.map(
                        (item: string, index: number) => (
                          <div key={index} className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-1.5 h-4 w-4 rounded border-muted"
                              checked={checkedItems.includes(item)}
                              onChange={() => handleCheckItem(item)}
                            />
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const newItems = [
                                  ...(editedSummary?.action_items || []),
                                ];
                                newItems[index] = e.target.value;
                                setEditedSummary(
                                  (prev: EmailSummaryData | null) =>
                                    prev
                                      ? { ...prev, action_items: newItems }
                                      : null
                                );
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const newItems = [
                                    ...(editedSummary?.action_items || []),
                                  ];
                                  newItems.splice(index + 1, 0, "");
                                  setEditedSummary(
                                    (prev: EmailSummaryData | null) =>
                                      prev
                                        ? { ...prev, action_items: newItems }
                                        : null
                                  );
                                  // Focus the new input after render
                                  setTimeout(() => {
                                    const inputs =
                                      document.querySelectorAll<HTMLInputElement>(
                                        "[data-action-item]"
                                      );
                                    inputs[index + 1]?.focus();
                                  }, 0);
                                } else if (
                                  e.key === "Backspace" &&
                                  item === "" &&
                                  editedSummary?.action_items &&
                                  editedSummary.action_items.length > 1
                                ) {
                                  e.preventDefault();
                                  const newItems = [
                                    ...editedSummary.action_items,
                                  ];
                                  newItems.splice(index, 1);
                                  setEditedSummary(
                                    (prev: EmailSummaryData | null) =>
                                      prev
                                        ? { ...prev, action_items: newItems }
                                        : null
                                  );
                                  // Focus the previous input
                                  setTimeout(() => {
                                    const inputs =
                                      document.querySelectorAll<HTMLInputElement>(
                                        "[data-action-item]"
                                      );
                                    inputs[index - 1]?.focus();
                                  }, 0);
                                }
                              }}
                              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-ring rounded px-2 py-1"
                              placeholder="Enter action item..."
                              data-action-item
                            />
                          </div>
                        )
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditedSummary((prev: EmailSummaryData | null) =>
                            prev
                              ? {
                                  ...prev,
                                  action_items: [
                                    ...(prev.action_items || []),
                                    "",
                                  ],
                                }
                              : null
                          );
                        }}
                        className="w-full mt-2"
                      >
                        Add Action Item
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleSaveSummary}
                      disabled={isSaving}
                      className="w-full h-12 sm:h-10"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditedSummary(summary?.summary || null);
                        setIsEditing(false);
                      }}
                      className="w-full h-12 sm:h-10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : summary ? (
                <div className="space-y-8">
                  {/* Summary Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          summary.summary.sentiment === "positive"
                            ? "success"
                            : summary.summary.sentiment === "negative"
                            ? "destructive"
                            : "secondary"
                        }
                        className="px-2 py-1"
                      >
                        {summary.summary.sentiment}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Generated {new Date(summary.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>

                  {/* Main Summary */}
                  {summary.summary.summary && (
                    <div className="prose dark:prose-invert max-w-none">
                      <h3 className="text-lg font-medium mb-3">Key Summary</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {summary.summary.summary}
                      </p>
                    </div>
                  )}

                  {/* Main Points */}
                  {summary.summary.main_points &&
                    summary.summary.main_points.length > 0 && (
                      <div className="prose dark:prose-invert max-w-none">
                        <h3 className="text-lg font-medium mb-3">
                          Main Points
                        </h3>
                        <ul className="space-y-2 list-disc pl-4 marker:text-muted-foreground">
                          {summary.summary.main_points.map(
                            (point: string, i: number) => (
                              <li key={i} className="text-muted-foreground">
                                {point}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {/* Action Items */}
                  {summary.summary.action_items &&
                    summary.summary.action_items.length > 0 && (
                      <div className="prose dark:prose-invert max-w-none">
                        <h3 className="text-lg font-medium mb-3">
                          Action Items
                        </h3>
                        <ul className="space-y-3">
                          {summary.summary.action_items.map(
                            (item: string, i: number) => (
                              <li
                                key={i}
                                className="flex items-start gap-3 text-muted-foreground"
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 rounded border-muted"
                                  checked={checkedItems.includes(item)}
                                  onChange={() => handleCheckItem(item)}
                                />
                                <span className="flex-1 leading-relaxed">
                                  {item}
                                </span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {/* Key Dates */}
                  {summary.summary.key_dates &&
                    summary.summary.key_dates.length > 0 && (
                      <div className="prose dark:prose-invert max-w-none">
                        <h3 className="text-lg font-medium mb-3">Key Dates</h3>
                        <div className="space-y-3">
                          {summary.summary.key_dates.map(
                            (
                              date: { date: string; description: string },
                              i: number
                            ) => (
                              <div key={i} className="flex flex-col gap-1">
                                <Badge variant="outline" className="w-fit">
                                  {date.date}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {date.description}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Important Links */}
                  {summary.summary.important_links &&
                    summary.summary.important_links.length > 0 && (
                      <div className="prose dark:prose-invert max-w-none">
                        <h3 className="text-lg font-medium mb-3">
                          Important Links
                        </h3>
                        <ul className="space-y-2">
                          {summary.summary.important_links.map(
                            (link: string, i: number) => (
                              <li key={i}>
                                <a
                                  href={link}
                                  className="text-primary hover:underline break-all"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {link}
                                </a>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>
                    Select a template and click Analyze to process this email
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <EmailViewModal
          isOpen={!!selectedEmail}
          onClose={() => setSelectedEmail(null)}
          email={selectedEmail?.email || null}
          onReply={(emailId) =>
            router.push(`/dashboard/compose/reply/${emailId}`)
          }
        />
      </div>
    </div>
  );
}
