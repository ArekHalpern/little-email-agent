"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

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

export default function SummariesPage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/email-summaries");
        if (!response.ok) throw new Error("Failed to fetch summaries");
        const data = await response.json();
        setSummaries(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load summaries"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaries();
  }, []);

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
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Email Summaries</h1>
        <p className="text-muted-foreground">
          Your analyzed emails and their key points
        </p>
      </div>

      <div className="space-y-4">
        {summaries.map((summary) => (
          <Card
            key={summary.id}
            className="hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() =>
              router.push(`/dashboard/summaries/${summary.emailId}`)
            }
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-4">
                  {/* Header Section */}
                  <div className="flex items-center gap-2">
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
                    <span className="text-sm text-muted-foreground">
                      {new Date(summary.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Summary Section */}
                  <div>
                    <h2 className="font-medium mb-2 line-clamp-1">
                      {summary.summary.summary}
                    </h2>
                    <div className="text-sm text-muted-foreground space-y-2">
                      {/* Action Items Preview */}
                      {summary.summary.action_items.length > 0 && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>
                            {summary.checkedActionItems.length} of{" "}
                            {summary.summary.action_items.length} tasks
                            completed
                          </span>
                        </div>
                      )}

                      {/* Key Points Preview */}
                      {summary.summary.main_points.length > 0 && (
                        <p className="line-clamp-2">
                          {summary.summary.main_points[0]}
                          {summary.summary.main_points.length > 1 && "..."}
                        </p>
                      )}

                      {/* Key Dates Preview */}
                      {summary.summary.key_dates.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {summary.summary.key_dates[0].date}
                          </Badge>
                          <span className="line-clamp-1">
                            {summary.summary.key_dates[0].description}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrow Icon */}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}

        {summaries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No summaries yet</p>
            <p className="text-sm text-muted-foreground">
              Process some emails to see their summaries here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
