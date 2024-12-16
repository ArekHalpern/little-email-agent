"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Email, EmailSummaryData } from "../../types";
import { EmailThread } from "../../_components/EmailThread";
import { EmailRightPanel } from "../../_components/EmailRightPanel";
import { getThreadWordCount } from "@/lib/wordCount";

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
  const [summary, setSummary] = useState<EmailSummaryData | null>(null);

  useEffect(() => {
    const fetchThread = async () => {
      if (!emailId) return;
      try {
        setIsLoading(true);
        const response = await fetch(`/api/gmail/messages/${emailId}/thread`);
        if (!response.ok) throw new Error("Failed to fetch thread");
        const data = await response.json();
        setThread(data.thread);
        if (data.thread.length > 0) {
          setCurrentEmail(data.thread[0]);
          // Calculate word count immediately
          const count = getThreadWordCount(data.thread, data.thread[0]);
          setWordCount(count);
        }
      } catch (error) {
        console.error("Error fetching thread:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThread();
  }, [emailId]);

  const handleAnalyze = async (endpoint: "openai" | "anthropic") => {
    if (!currentEmail || !thread.length) return;

    try {
      setIsAnalyzing(true);
      const response = await fetch(`/api/${endpoint}/analyze-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailContent: currentEmail,
          threadContext: thread,
        }),
      });

      if (!response.ok) throw new Error("Analysis failed");
      const data = await response.json();
      setSummary(data.result);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

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
      />
    </div>
  );
}
