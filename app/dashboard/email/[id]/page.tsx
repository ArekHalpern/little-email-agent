"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Reply,
  Sparkles,
  Loader2,
  Mail,
  Forward,
  MoreHorizontal,
} from "lucide-react";
import { Email } from "../../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmailThread } from "../../_components/EmailThread";
import { EmailRightPanel } from "../../_components/EmailRightPanel";
import { EmailSummaryData } from "../../types";

export default function EmailViewPage() {
  const params = useParams();
  const router = useRouter();
  const emailId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isReplying, setIsReplying] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [thread, setThread] = useState<Email[]>([]);
  const replyRef = useRef<HTMLDivElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [summary, setSummary] = useState<EmailSummaryData | null>(null);
  const [currentEmail, setCurrentEmail] = useState<Email | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!currentEmail || !thread.length) return;

    try {
      setIsAnalyzing(true);
      // Try OpenAI first
      const response = await fetch("/api/openai/custom-email-sythesizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailContent: currentEmail,
          threadContext: thread,
        }),
      });

      if (!response.ok) {
        // If OpenAI fails, try Anthropic
        console.log("OpenAI failed, trying Anthropic...");
        const anthropicResponse = await fetch("/api/anthropic/analyze-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailContent: currentEmail,
            threadContext: thread,
          }),
        });

        if (!anthropicResponse.ok) throw new Error("Both analyzers failed");
        const data = await anthropicResponse.json();
        setSummary(data.result);
        return;
      }

      const data = await response.json();
      setSummary(data.result);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentEmail, thread]);

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
        }
      } catch (error) {
        console.error("Error fetching thread:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThread();
  }, [emailId]);

  useEffect(() => {
    if (currentEmail) {
      handleAnalyze();
    }
  }, [currentEmail, handleAnalyze]);

  useEffect(() => {
    // Scroll reply composer into view when opened
    if (isReplying && replyRef.current) {
      replyRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isReplying]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inbox
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAnalysis(!showAnalysis);
                if (!showAnalysis) handleAnalyze();
              }}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {showAnalysis ? "Hide Analysis" : "Analyze"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsReplying(true)}
              className="gap-2"
            >
              <Reply className="h-4 w-4" />
              Reply
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Forward className="h-4 w-4 mr-2" />
                  Forward
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="h-4 w-4 mr-2" />
                  Mark as unread
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Email Thread */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="max-w-3xl mx-auto">
            <EmailThread emails={thread} className="mt-4" />
          </div>
        </div>

        {/* Right Panel */}
        {(isReplying || showAnalysis) && (
          <EmailRightPanel
            isReplying={isReplying}
            onCloseReply={() => setIsReplying(false)}
            showAnalysis={showAnalysis}
            isAnalyzing={isAnalyzing}
            summary={summary}
          />
        )}
      </div>
    </div>
  );
}
