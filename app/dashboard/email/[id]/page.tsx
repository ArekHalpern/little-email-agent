"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Email } from "../../types";
import { EmailThread } from "../../_components/EmailThread";
import { EmailRightPanel } from "../../_components/EmailRightPanel";
import { getThreadWordCount } from "@/lib/wordCount";
import { emailCache, EmailCacheData } from "@/lib/cache";
import type { Summary } from "../../types";

export default function EmailViewPage() {
  const params = useParams();
  const router = useRouter();
  const emailId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isReplying, setIsReplying] = useState(false);
  const [thread, setThread] = useState<Email[]>([]);
  const [currentEmail, setCurrentEmail] = useState<Email | null>(null);
  const [wordCount, setWordCount] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  useEffect(() => {
    const fetchThread = async () => {
      if (!emailId) return;
      try {
        setIsLoading(true);
        const response = await fetch(`/api/gmail/messages/${emailId}/thread`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch thread");
        }

        if (!data.thread || !Array.isArray(data.thread)) {
          throw new Error("Invalid thread data received");
        }

        setThread(data.thread);
        if (data.thread.length > 0) {
          setCurrentEmail(data.thread[0]);
          const count = getThreadWordCount(data.thread, data.thread[0]);
          setWordCount(count);
        }
      } catch (error) {
        console.error("Error fetching thread:", error);
        // Optionally show a toast or other user feedback here
      } finally {
        setIsLoading(false);
      }
    };

    fetchThread();
  }, [emailId]);

  // Add useEffect for refreshing thread
  useEffect(() => {
    if (shouldRefresh) {
      const refreshThread = async () => {
        try {
          const response = await fetch(`/api/gmail/messages/${emailId}/thread`);
          if (!response.ok) throw new Error("Failed to fetch thread");
          const data = await response.json();
          setThread(data.thread);
        } catch (error) {
          console.error("Error refreshing thread:", error);
        } finally {
          setShouldRefresh(false);
        }
      };

      refreshThread();
    }
  }, [shouldRefresh, emailId]);

  const handleAnalyze = async (endpoint: "openai" | "anthropic") => {
    if (!currentEmail || !thread.length) return;

    try {
      setIsAnalyzing(true);
      const apiEndpoint =
        endpoint === "openai"
          ? "/api/openai/custom-email-sythesizer"
          : "/api/anthropic/analyze-email";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailContent: currentEmail,
          threadContext: thread,
        }),
      });

      if (!response.ok) throw new Error("Analysis failed");
      const { result } = await response.json();

      // Save the summary to the database
      const saveResponse = await fetch("/api/email-summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId,
          summary: result,
        }),
      });

      if (!saveResponse.ok) throw new Error("Failed to save summary");

      const savedSummary = await saveResponse.json();
      setSummary(savedSummary);

      // Cache the summary
      const cacheKey = `summary:${emailId}`;
      const cachedData = emailCache.get(cacheKey) as EmailCacheData;
      if (cachedData?.email) {
        emailCache.set(cacheKey, {
          ...cachedData,
          summary: savedSummary,
        });
      }
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Add effect to load cached summary
  useEffect(() => {
    const loadCachedSummary = async () => {
      // Check cache first
      const cacheKey = `summary:${emailId}`;
      const cachedData = emailCache.get(cacheKey) as EmailCacheData;

      if (cachedData?.summary) {
        setSummary(cachedData.summary);
        return;
      }

      // If not in cache, try to fetch from API
      try {
        const response = await fetch(`/api/email-summaries?emailId=${emailId}`);
        if (response.ok) {
          const summaryData = await response.json();
          setSummary(summaryData);

          // Cache the fetched summary
          if (cachedData?.email) {
            emailCache.set(cacheKey, {
              ...cachedData,
              summary: summaryData,
            });
          }
        }
      } catch (error) {
        console.error("Error loading summary:", error);
      }
    };

    if (emailId) {
      loadCachedSummary();
    }
  }, [emailId]);

  const handleCheckItem = async (item: string) => {
    if (!summary) return;

    try {
      const newCheckedItems = summary.checkedActionItems.includes(item)
        ? summary.checkedActionItems.filter((i) => i !== item)
        : [...summary.checkedActionItems, item];

      const response = await fetch("/api/email-summaries/checked-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId,
          checkedItems: newCheckedItems,
        }),
      });

      if (!response.ok) throw new Error("Failed to update checked items");

      // Update local state
      setSummary((prev) =>
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
      if (cachedData?.summary) {
        emailCache.set(cacheKey, {
          ...cachedData,
          summary: {
            ...cachedData.summary,
            checkedActionItems: newCheckedItems,
          },
        });
      }
    } catch (error) {
      console.error("Error updating checked items:", error);
    }
  };

  const handleEmailSent = useCallback(() => {
    setShouldRefresh(true);
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="mb-6">
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
          <EmailThread emails={thread} />
        </div>
      </div>

      {/* Right Panel - Always visible */}
      <EmailRightPanel
        isReplying={isReplying}
        onCloseReply={() => setIsReplying(false)}
        showAnalysis={true}
        threadId={emailId}
        isAnalyzing={isAnalyzing}
        summary={summary}
        wordCount={wordCount}
        onAnalyze={handleAnalyze}
        onCheckItem={handleCheckItem}
        onEmailSent={handleEmailSent}
      />
    </div>
  );
}
