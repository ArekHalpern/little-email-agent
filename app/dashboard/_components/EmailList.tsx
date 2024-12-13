"use client";

import React from "react";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, MailOpen } from "lucide-react";
import { getCustomerPrompts } from "../actions";
import { createClient } from "@/lib/auth/supabase/client";
import { useRouter } from "next/navigation";
import { EmailViewModal } from "./EmailViewModal";
import { Email, EmailThread } from "../types";
import GoogleAuth from "@/app/(auth)/_components/GoogleAuth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EmailListProps {
  onEmailSelect: (emailId: string) => void;
}

export default function EmailList({ onEmailSelect }: EmailListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<{
    email: Email;
    thread?: EmailThread;
  } | null>(null);
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
        await getCustomerPrompts(session.user.id);
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

  const processEmail = async (emailId: string) => {
    try {
      router.push(`/dashboard/summaries/${emailId}`);
    } catch (error) {
      console.error("Error navigating to summary:", error);
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

  function LoadMoreButton({
    currentPage,
    totalEmails,
    onLoadMore,
    loading,
  }: {
    currentPage: number;
    totalEmails: number;
    onLoadMore: () => void;
    loading?: boolean;
  }) {
    const hasMore = currentPage * EMAILS_PER_PAGE < totalEmails;

    if (!hasMore) return null;

    return (
      <div className="p-4 flex justify-center">
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </>
          ) : (
            "Load More"
          )}
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
              <div
                key={`skeleton-${i}`}
                className="border-b p-3 sm:p-4 animate-pulse"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-md bg-muted" />
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
    <div className="w-full bg-background overflow-x-hidden h-full">
      <div className="flex flex-col h-full">
        <div className="border-b p-3 sm:p-4 space-y-3 sm:space-y-4">
          <h2 className="font-semibold text-sm sm:text-base">Inbox</h2>
          <div className="relative">
            <input
              type="search"
              placeholder="Search emails..."
              className="w-full px-3 py-1.5 sm:py-2 border rounded-md text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {totalEmails > 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              Showing {(currentPage - 1) * EMAILS_PER_PAGE + 1}-
              {Math.min(currentPage * EMAILS_PER_PAGE, totalEmails)} of{" "}
              {totalEmails} emails
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {emails.map((email: Email) => (
            <div
              key={`email-${email.id}`}
              className="border-b p-3 sm:p-4 hover:bg-muted/50 cursor-pointer transition-colors max-w-full"
              onClick={() => onEmailSelect(email.id)}
            >
              <div className="flex flex-col gap-3 max-w-full">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                    <h3 className="font-medium text-sm sm:text-base break-words min-w-0 flex-1">
                      {getEmailSubject(email)}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              processEmail(email.id);
                            }}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Analyze Email</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewEmail(email)}
                            className="h-8 w-8"
                          >
                            <MailOpen className="h-4 w-4" />
                            <span className="sr-only">View email</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Email</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                    {getEmailFrom(email)}
                  </p>
                  <p className="text-xs sm:text-sm mt-1 text-muted-foreground/80 break-words">
                    {email.snippet}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {totalEmails > 0 && (
            <>
              <div className="hidden sm:block">
                <Pagination
                  currentPage={currentPage}
                  totalEmails={totalEmails}
                  onPageChange={handlePageChange}
                />
              </div>
              <div className="sm:hidden">
                <LoadMoreButton
                  currentPage={currentPage}
                  totalEmails={totalEmails}
                  onLoadMore={() => handlePageChange(currentPage + 1)}
                  loading={loading}
                />
              </div>
            </>
          )}
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
