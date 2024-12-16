import { EmailReplyComposer } from "./EmailReplyComposer";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailSummaryData } from "../types";

interface EmailRightPanelProps {
  isReplying: boolean;
  onCloseReply: () => void;
  showAnalysis: boolean;
  isAnalyzing?: boolean;
  summary?: EmailSummaryData | null;
  className?: string;
}

export function EmailRightPanel({
  isReplying,
  onCloseReply,
  showAnalysis,
  isAnalyzing,
  summary,
  className,
}: EmailRightPanelProps) {
  return (
    <div
      className={cn("w-[400px] flex-shrink-0 border-l bg-muted/10", className)}
    >
      <div className="h-full flex flex-col">
        {/* Reply Section */}
        {isReplying && (
          <div className="flex-shrink-0 border-b">
            <EmailReplyComposer
              onClose={onCloseReply}
              inThread={true}
              className="border-none shadow-none rounded-none"
            />
          </div>
        )}

        {/* Analysis Section */}
        {showAnalysis && (
          <div className="flex-1 overflow-auto p-4">
            <Card className="h-full">
              <div className="p-4">
                <h3 className="font-semibold mb-4">Email Analysis</h3>
                {isAnalyzing ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : summary ? (
                  <div className="space-y-4">
                    {/* Summary content */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        {summary.summary}
                      </p>
                    </div>

                    {/* Action Items */}
                    {summary.action_items &&
                      summary.action_items.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Action Items
                          </h4>
                          <ul className="space-y-2">
                            {summary.action_items.map((item, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 rounded border-muted"
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
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Analysis will appear here...
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
