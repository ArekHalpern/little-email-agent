"use client";

import React from "react";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreVertical } from "lucide-react";
import type { EmailPromptPayload } from "../actions";
import { getCustomerPrompts } from "../actions";
import { createClient } from "@/lib/auth/supabase/client";
import { EmailSummaryPanel } from "./EmailSummaryPanel";
import { cn } from "@/lib/utils";

interface Email {
  id: string;
  snippet: string;
  threadId?: string;
  internalDate?: string;
  payload: {
    headers: {
      name: string;
      value: string;
    }[];
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

export default function EmailList(): React.JSX.Element {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<{
    email: Email;
    thread?: EmailThread;
  } | null>(null);
  const [prompts, setPrompts] = useState<EmailPromptPayload[]>([]);
  const [processingEmails, setProcessingEmails] = useState<
    Record<string, boolean>
  >({});
  const [emailSummaries, setEmailSummaries] = useState<Record<string, string>>(
    {}
  );
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const EMAILS_PER_PAGE = 10;
  const [totalEmails, setTotalEmails] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (debouncedSearch !== undefined) {
      fetchEmails(0, 1);
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEmailsAndPrompts = useCallback(() => {
    fetchEmails(0, 1);
    fetchPrompts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchEmailsAndPrompts();
  }, [fetchEmailsAndPrompts]);

  const fetchPrompts = async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const templates = await getCustomerPrompts(session.user.id);
        setPrompts(templates);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
    }
  };

  const fetchEmails = async (retryCount = 0, page: number) => {
    try {
      setLoading(true);
      setAuthError(null);

      const url = new URL("/api/gmail/inbox", window.location.origin);
      url.searchParams.append("page", page.toString());
      if (debouncedSearch) {
        url.searchParams.append("q", debouncedSearch);
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.status === 401) {
        if (retryCount === 0) {
          const supabase = createClient();
          const {
            data: { session },
            error,
          } = await supabase.auth.refreshSession();
          if (!error && session) {
            return fetchEmails(retryCount + 1, page);
          }
        }
        setAuthError(
          data.error || "Please authenticate with Gmail to view your emails"
        );
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch emails");
      }

      setEmails(data.messages);
      setTotalEmails(data.totalEmails);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching emails:", error);
      setAuthError(
        error instanceof Error ? error.message : "Failed to fetch emails"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    fetchEmails(0, page);
  };

  const handleEmailSelection = async (emailId: string) => {
    setSelectedEmailId(emailId);

    try {
      const response = await fetch(`/api/gmail/messages/${emailId}`);
      if (!response.ok) throw new Error("Failed to fetch email");
      const data = await response.json();
      setSelectedEmail(data);
    } catch (error) {
      console.error("Error fetching email:", error);
    }
  };

  const getEmailSubject = (email: Email) => {
    return (
      email.payload.headers.find((h) => h.name.toLowerCase() === "subject")
        ?.value || "No Subject"
    );
  };

  const getEmailFrom = (email: Email) => {
    return (
      email.payload.headers.find((h) => h.name.toLowerCase() === "from")
        ?.value || "Unknown Sender"
    );
  };

  const decodeEmailBody = (email: Email) => {
    const htmlPart = email.payload.parts?.find(
      (part) => part.mimeType === "text/html"
    );
    const plainPart = email.payload.parts?.find(
      (part) => part.mimeType === "text/plain"
    );

    const body =
      htmlPart?.body?.data || plainPart?.body?.data || email.payload.body?.data;

    if (!body) return "";

    const decoded = decodeURIComponent(
      escape(atob(body.replace(/-/g, "+").replace(/_/g, "/")))
    );

    if (!htmlPart && plainPart) {
      return decoded.replace(/\n/g, "<br>");
    }

    return decoded;
  };

  const processEmail = async (emailId: string, promptId: string) => {
    try {
      setProcessingEmails((prev) => ({ ...prev, [emailId]: true }));

      const email = emails.find((e) => e.id === emailId);
      if (!email) return;

      const emailContent = email.snippet; // Or use the full email content if needed

      const response = await fetch("/api/openai/custom-email-sythesizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailContent, promptId }),
      });

      if (!response.ok) throw new Error("Failed to process email");

      const data = await response.json();
      setEmailSummaries((prev) => ({ ...prev, [emailId]: data.result }));
    } catch (error) {
      console.error("Error processing email:", error);
    } finally {
      setProcessingEmails((prev) => ({ ...prev, [emailId]: false }));
    }
  };

  function Pagination({
    currentPage,
    totalEmails,
    onPageChange,
  }: {
    currentPage: number;
    totalEmails: number;
    onPageChange: (page: number) => void;
  }) {
    const totalPages = Math.ceil(totalEmails / EMAILS_PER_PAGE);

    // Show max 5 pages at a time
    let startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    // Adjust start if we're near the end
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    const pages = Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );

    return (
      <div className="flex justify-center items-center gap-1 p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="hidden sm:inline-flex"
        >
          First
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>

        <div className="flex gap-1 overflow-auto px-1 max-w-[200px] sm:max-w-none">
          {startPage > 1 && <div className="flex items-center px-2">...</div>}

          {pages.map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className="w-8"
            >
              {page}
            </Button>
          ))}

          {endPage < totalPages && (
            <div className="flex items-center px-2">...</div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="hidden sm:inline-flex"
        >
          Last
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <div className="w-[45%] border-r bg-background">
          <div className="flex flex-col h-full">
            <div className="border-b p-4">
              <h2 className="font-semibold">Inbox</h2>
            </div>
            <div className="flex-1 overflow-auto">
              {[...Array(5)].map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="border-b p-4 animate-pulse"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                    <div className="h-8 w-8 rounded-md bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 bg-muted/5" />
      </>
    );
  }

  if (authError) {
    return (
      <>
        <div className="w-[45%] border-r bg-background">
          <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
            <p className="text-muted-foreground text-center">{authError}</p>
            <Button
              onClick={async () => {
                const supabase = createClient();

                // First sign out to clear any existing session
                await supabase.auth.signOut();

                const { data, error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?provider=google`,
                    scopes:
                      "email profile https://www.googleapis.com/auth/gmail.readonly",
                    queryParams: {
                      access_type: "offline",
                      prompt: "consent select_account",
                      response_type: "code",
                    },
                  },
                });

                if (error) {
                  console.error("Auth error:", error);
                } else if (data.url) {
                  window.location.href = data.url;
                }
              }}
            >
              Connect Gmail Account
            </Button>
          </div>
        </div>
        <div className="flex-1 bg-muted/5">
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>Connect your Gmail account to get started</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="w-[45%] border-r bg-background">
        <div className="flex flex-col h-full">
          <div className="border-b p-4 space-y-4">
            <h2 className="font-semibold">Inbox</h2>
            <div className="relative">
              <input
                type="search"
                placeholder="Search emails..."
                className="w-full px-3 py-2 border rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {emails.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * EMAILS_PER_PAGE + 1}-
                {Math.min(currentPage * EMAILS_PER_PAGE, totalEmails)} of{" "}
                {totalEmails} emails
              </p>
            )}
          </div>
          <div className="flex flex-col h-[calc(100%-var(--header-height))]">
            <div className="flex-1 overflow-auto">
              {emails
                .filter(
                  (email, index, self) =>
                    index === self.findIndex((e) => e.id === email.id)
                )
                .map((email) => (
                  <div
                    key={`email-${email.id}`}
                    className={cn(
                      "border-b p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                      selectedEmailId === email.id && "bg-muted"
                    )}
                    onClick={() => handleEmailSelection(email.id)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">
                          {getEmailSubject(email)}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {getEmailFrom(email)}
                        </p>
                        <p className="text-sm mt-1 line-clamp-2 text-muted-foreground/80">
                          {email.snippet}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            {processingEmails[email.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                          {prompts.map((prompt) => (
                            <DropdownMenuItem
                              key={prompt.id}
                              onClick={(
                                e: React.MouseEvent<HTMLDivElement>
                              ) => {
                                e.stopPropagation();
                                processEmail(email.id, prompt.id);
                              }}
                            >
                              Process with {prompt.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
            </div>
            <div className="border-t bg-background">
              <Pagination
                currentPage={currentPage}
                totalEmails={totalEmails}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-muted/5">
        <EmailSummaryPanel
          summary={selectedEmailId ? emailSummaries[selectedEmailId] : null}
          emailSubject={
            selectedEmailId
              ? getEmailSubject(emails.find((e) => e.id === selectedEmailId)!)
              : undefined
          }
        />
      </div>

      <Dialog
        open={!!selectedEmail}
        onOpenChange={() => setSelectedEmail(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEmail && getEmailSubject(selectedEmail.email)}
            </DialogTitle>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>{selectedEmail && getEmailFrom(selectedEmail.email)}</span>
              {selectedEmail?.thread?.messages && (
                <span className="px-2 py-0.5 bg-muted rounded-full text-xs">
                  {selectedEmail.thread.messages.length} messages in thread
                </span>
              )}
            </div>
          </DialogHeader>

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
                        {getEmailFrom(message)}
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
    </>
  );
}

function useDebounce<T>(value: T, delay?: number): [T] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return [debouncedValue];
}
