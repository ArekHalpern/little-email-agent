"use client";

import React from "react";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Reply } from "lucide-react";
import { getCustomerPrompts } from "../actions";
import { createClient } from "@/lib/auth/supabase/client";
import { useRouter } from "next/navigation";
import { EmailViewModal } from "./EmailViewModal";
import { Email, EmailThread } from "../types";
import GoogleAuth from "@/app/(auth)/_components/GoogleAuth";
import { emailCache } from "@/lib/cache";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/lib/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EmailList({
  onReply,
}: {
  onReply?: (emailId: string) => void;
}) {
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
  const { toast } = useToast();
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [deletingEmails, setDeletingEmails] = useState<Set<string>>(new Set());
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);

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

      const response = await fetch(url, {
        cache: "no-store", // Prevent caching of GET request
      });
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

      // Update cache with new data
      const cacheKey = `emails:${page}:${debouncedSearch}`;
      emailCache.set(cacheKey, data);
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

  const handleViewEmail = async (email: Email) => {
    router.push(`/dashboard/email/${email.id}`);
  };

  const handleDeleteEmail = async (emailId: string) => {
    setDeletingEmail(emailId);

    try {
      const response = await fetch(`/api/gmail/messages/${emailId}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Failed to delete email");

      // Remove the email from local state immediately
      setEmails((prevEmails) =>
        prevEmails.filter((email) => email.id !== emailId)
      );

      // Update total count
      setTotalEmails((prev) => Math.max(0, prev - 1));

      // Clear all cache
      emailCache.clear();

      // If this was the last email on the page and not the first page, go to previous page
      if (emails.length === 1 && currentPage > 1) {
        await fetchEmails(0, currentPage - 1);
      } else if (emails.length > 1) {
        // Only refetch if there are more emails to show
        await fetchEmails(0, currentPage);
      }

      toast({
        title: "Email deleted",
        description: "The email has been moved to trash",
      });
    } catch (error) {
      console.error("Error deleting email:", error);
      toast({
        title: "Error",
        description: "Failed to delete email",
        variant: "destructive",
      });

      // Refresh the list to ensure consistency
      await fetchEmails(0, currentPage);
    } finally {
      setDeletingEmail(null);
    }
  };

  const handleDeleteSelected = async () => {
    const emailsToDelete = Array.from(selectedEmails);
    setDeletingEmails(new Set(emailsToDelete));

    try {
      // Delete all emails in parallel
      await Promise.all(
        emailsToDelete.map(async (emailId) => {
          const response = await fetch(`/api/gmail/messages/${emailId}`, {
            method: "DELETE",
            cache: "no-store", // Prevent caching of DELETE request
          });

          if (!response.ok) {
            throw new Error(`Failed to delete email ${emailId}`);
          }
        })
      );

      // Clear selection
      setSelectedEmails(new Set());

      // Clear all cache
      emailCache.clear();

      // Update local state
      setEmails((prevEmails) =>
        prevEmails.filter((email) => !emailsToDelete.includes(email.id))
      );

      // Update total count
      setTotalEmails((prev) => Math.max(0, prev - emailsToDelete.length));

      // Refresh the email list
      await fetchEmails(0, currentPage);

      toast({
        title: "Emails deleted",
        description: `${emailsToDelete.length} emails have been moved to trash`,
      });
    } catch (error) {
      console.error("Error deleting emails:", error);
      toast({
        title: "Error",
        description: "Failed to delete some emails",
        variant: "destructive",
      });

      // Refresh to ensure consistency
      await fetchEmails(0, currentPage);
    } finally {
      setDeletingEmails(new Set());
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    setEmailToDelete(emailId);
  };

  const handleConfirmDelete = async () => {
    if (!emailToDelete) return;

    try {
      await handleDeleteEmail(emailToDelete);
    } finally {
      setEmailToDelete(null);
    }
  };

  function Pagination({
    currentPage,
    totalEmails,
    onPageChange,
    isMobile,
  }: {
    currentPage: number;
    totalEmails: number;
    onPageChange: (page: number) => void;
    isMobile?: boolean;
  }) {
    const totalPages = Math.ceil(totalEmails / EMAILS_PER_PAGE);

    if (isMobile) {
      return (
        <div className="flex justify-between items-center p-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-[100px]"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-[100px]"
          >
            Next
          </Button>
        </div>
      );
    }

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

        <div className="flex gap-1 overflow-auto px-1">
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
        >
          Last
        </Button>
      </div>
    );
  }

  const isUnread = (email: Email) => {
    return email.labelIds?.includes("UNREAD");
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(parseInt(timestamp));
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  };

  const handleReply = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    if (onReply) {
      onReply(emailId);
    }
  };

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
    <div className="flex flex-col h-full min-w-0 bg-background">
      <div className="border-b p-3 sm:p-4 space-y-3 sm:space-y-4 flex-shrink-0">
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
          <div className="flex items-center justify-between h-8">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Showing {(currentPage - 1) * EMAILS_PER_PAGE + 1}-
              {Math.min(currentPage * EMAILS_PER_PAGE, totalEmails)} of{" "}
              {totalEmails} emails
            </p>
            {selectedEmails.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedEmails.size} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deletingEmails.size > 0}
                  className="h-8"
                >
                  {deletingEmails.size > 0 ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="min-w-0">
          {emails.map((email: Email) => (
            <div
              key={`email-${email.id}`}
              className={cn(
                "border-b px-3 py-2 cursor-pointer transition-colors group",
                isUnread(email)
                  ? "hover:bg-muted/50 bg-background"
                  : "hover:bg-blue-50/50 bg-blue-50/30 dark:hover:bg-blue-950/50 dark:bg-blue-950/30",
                deletingEmails.has(email.id) && "opacity-50 pointer-events-none"
              )}
              onClick={() => handleViewEmail(email)}
            >
              <div className="flex items-start gap-2">
                <div
                  className="pt-0.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedEmails.has(email.id)}
                    onCheckedChange={(checked: boolean | "indeterminate") => {
                      setSelectedEmails((prev) => {
                        const newSet = new Set(prev);
                        if (checked === true) {
                          newSet.add(email.id);
                        } else {
                          newSet.delete(email.id);
                        }
                        return newSet;
                      });
                    }}
                    className="translate-y-[2px]"
                  />
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={cn(
                          "text-sm flex-1 overflow-hidden text-ellipsis",
                          isUnread(email)
                            ? "font-semibold"
                            : "font-medium text-muted-foreground"
                        )}
                      >
                        {getEmailFrom(email)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {email.internalDate
                          ? formatDateTime(email.internalDate).date
                          : ""}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {email.internalDate
                          ? formatDateTime(email.internalDate).time
                          : ""}
                      </span>
                    </div>
                  </div>
                  <h3
                    className={cn(
                      "text-sm truncate mb-0.5",
                      isUnread(email) && "font-medium"
                    )}
                  >
                    {getEmailSubject(email)}
                  </h3>
                  <p
                    className={cn(
                      "text-xs truncate",
                      isUnread(email)
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {email.snippet}
                  </p>
                </div>

                <div className="flex items-start gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => handleReply(e, email.id)}
                      >
                        <Reply className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reply</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteClick(e, email.id)}
                        disabled={deletingEmail === email.id}
                      >
                        {deletingEmail === email.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {deletingEmail === email.id
                        ? "Deleting..."
                        : "Delete Email"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {totalEmails > 0 && (
        <div className="flex-shrink-0 sticky bottom-0 left-0 right-0 bg-background border-t pb-[env(safe-area-inset-bottom)]">
          <div className="hidden sm:block">
            <Pagination
              currentPage={currentPage}
              totalEmails={totalEmails}
              onPageChange={handlePageChange}
            />
          </div>
          <div className="sm:hidden">
            <Pagination
              currentPage={currentPage}
              totalEmails={totalEmails}
              onPageChange={handlePageChange}
              isMobile={true}
            />
          </div>
        </div>
      )}

      <EmailViewModal
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        email={selectedEmail?.email || null}
        onReply={onReply}
      />

      <AlertDialog
        open={!!emailToDelete}
        onOpenChange={() => setEmailToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This email will be moved to trash. You can restore it from the
              trash folder within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
