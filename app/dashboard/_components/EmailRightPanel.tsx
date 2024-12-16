import { EmailReplyComposer } from "./EmailReplyComposer";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailSummaryData, Summary } from "../types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EmailRightPanelProps {
  isReplying: boolean;
  onCloseReply: () => void;
  showAnalysis: boolean;
  isAnalyzing?: boolean;
  summary?: Summary | null;
  className?: string;
  threadId?: string;
  wordCount: number;
  onAnalyze: (endpoint: "openai" | "anthropic") => void;
  onCheckItem?: (item: string) => void;
}

export function EmailRightPanel({
  onCloseReply,
  isAnalyzing,
  summary,
  className,
  threadId,
  wordCount,
  onAnalyze,
  onCheckItem,
}: EmailRightPanelProps) {
  return (
    <div className={cn("w-[380px] flex-shrink-0 border-l", className)}>
      <Tabs defaultValue="reply" className="h-full">
        <div className="border-b px-4 py-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reply">Reply</TabsTrigger>
            <TabsTrigger value="analysis">Summarize</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="reply" className="m-0 h-[calc(100vh-8rem)]">
          <EmailReplyComposer
            onClose={onCloseReply}
            inThread={true}
            threadId={threadId}
            className="border-none shadow-none rounded-none h-full"
          />
        </TabsContent>

        <TabsContent
          value="analysis"
          className="m-0 p-3 h-[calc(100vh-8rem)] overflow-y-auto"
        >
          <Card className="h-full">
            <div className="p-3 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Email Summary</h3>
                <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {wordCount.toLocaleString()} words
                </div>
              </div>

              {!summary && !isAnalyzing && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Choose a summarization method:
                  </p>

                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      onClick={() => onAnalyze("openai")}
                      className="justify-start h-auto py-2"
                      disabled={wordCount > 50000}
                    >
                      <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm">OpenAI Summary</span>
                        <span className="text-xs text-muted-foreground">
                          Best for shorter emails
                        </span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => onAnalyze("anthropic")}
                      className="justify-start h-auto py-2"
                    >
                      <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm">Claude Opus Summary</span>
                        <span className="text-xs text-muted-foreground">
                          Best for longer threads
                        </span>
                      </div>
                    </Button>
                  </div>
                </div>
              )}

              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Generating summary...
                  </p>
                </div>
              )}

              {summary && (
                <div className="space-y-4">
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
                      <span className="text-xs text-muted-foreground">
                        Generated {new Date(summary.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Points</h4>
                    <p className="text-sm text-muted-foreground">
                      {summary.summary.summary}
                    </p>
                  </div>

                  {summary.summary.action_items &&
                    summary.summary.action_items.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Action Items
                        </h4>
                        <ul className="space-y-2">
                          {summary.summary.action_items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-muted"
                                checked={summary.checkedActionItems.includes(
                                  item
                                )}
                                onChange={() => onCheckItem?.(item)}
                              />
                              <span className="text-sm text-muted-foreground">
                                {item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
