"use client";

import React from "react";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
import { useRouter } from "next/navigation";
import { EmailViewModal } from "./EmailViewModal";
import { Email, EmailThread } from "../types";
import GoogleAuth from "@/app/(auth)/_components/GoogleAuth";

interface EmailListProps {
  onEmailSelect: (emailId: string) => void;
}

export default function EmailList({ onEmailSelect }: EmailListProps) {
  const router = useRouter();
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

  const processEmail = async (emailId: string, promptId: string) => {
    try {
      console.log("Starting email processing:", { emailId, promptId });
      setProcessingEmails((prev) => ({ ...prev, [emailId]: true }));

      const email = emails.find((e) => e.id === emailId);
      if (!email) {
        console.error("Email not found:", emailId);
        return;
      }

      // Get the OpenAI analysis
      const response = await fetch("/api/openai/custom-email-sythesizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailContent: email, promptId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        throw new Error("Failed to process email");
      }

      router.push(`/dashboard/summaries/${emailId}`);
    } catch (error) {
      console.error("Error processing email:", error);
    } finally {
      setProcessingEmails((prev) => ({ ...prev, [emailId]: false }));
    }
  };

  const handleViewEmail = (email: Email) => {
    setSelectedEmail({ email });

    // Fetch thread if it exists
    if (email.threadId) {
      fetchEmailThread(email.threadId);
    }
  };

  const fetchEmailThread = async (threadId: string) => {
    try {
      const response = await fetch(`/api/gmail/messages/${threadId}`);
      if (!response.ok) throw new Error("Failed to fetch thread");
      const data = await response.json();
      setSelectedEmail((prev) => ({
        ...prev!,
        thread: data.thread,
      }));
    } catch (error) {
      console.error("Error fetching thread:", error);
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
      <div className="flex justify-center items-center gap-1 p-4 border-t">
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
      <div className="w-full bg-background">
        <div className="flex flex-col h-full">
          <div className="border-b p-4">
            <h2 className="font-semibold">Inbox</h2>
          </div>
          <div className="flex-1 overflow-auto">
            {[...Array(5)].map((_, i) => (
              <div key={`skeleton-${i}`} className="border-b p-4 animate-pulse">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-16 rounded-md bg-muted" />
                    <div className="h-8 w-8 rounded-md bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="w-full bg-background">
        <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
          <p className="text-muted-foreground text-center">{authError}</p>
          <GoogleAuth mode="login" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background">
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
        <div className="flex-1 overflow-auto">
          {emails.map((email) => (
            <div
              key={`email-${email.id}`}
              className="border-b p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onEmailSelect(email.id)}
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewEmail(email);
                    }}
                  >
                    View
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                          onClick={(e) => {
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
            </div>
          ))}
          <Pagination
            currentPage={currentPage}
            totalEmails={totalEmails}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <EmailViewModal
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        email={selectedEmail?.email || null}
        thread={selectedEmail?.thread}
      />
    </div>
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
