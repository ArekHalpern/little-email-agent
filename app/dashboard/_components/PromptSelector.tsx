"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createEmailPrompt, getCustomerPrompts } from "../actions";
import type { EmailPromptPayload } from "../actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/auth/supabase/client";
import { cn } from "@/lib/utils";

const supabase = createClient();

const EXAMPLE_PROMPTS = [
  {
    name: "Email Summarizer",
    description: "Get a concise summary of long email threads",
    prompt: `You are a helpful assistant that summarizes email content clearly and concisely.
Extract and organize the following:
- Main topic/subject
- Key points
- Action items (if any)
- Important dates/deadlines
- Next steps or required responses
Present the summary in a clear, bulleted format.`,
  },
  {
    name: "Reservation Details",
    description: "Extract key details from restaurant reservation emails",
    prompt: `You are a helpful assistant that extracts restaurant reservation details from emails. 
Extract the following information if present:
- Restaurant name
- Date and time
- Number of guests
- Special requests
- Contact information
Format the response in a clear, structured way.`,
  },
  {
    name: "Meeting Summary",
    description: "Summarize meeting details and action items",
    prompt: `Analyze the email thread and extract:
- Meeting purpose
- Key decisions made
- Action items and who's responsible
- Follow-up dates
Present this in a clear, bulleted format.`,
  },
];

interface PromptSelectorProps {
  onPromptSelect: (prompt: EmailPromptPayload) => void;
}

export function PromptSelector({ onPromptSelect }: PromptSelectorProps) {
  const [prompts, setPrompts] = useState<EmailPromptPayload[]>([]);
  const [newPrompt, setNewPrompt] = useState({
    name: "",
    description: "",
    prompt: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function fetchPrompts() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          const userPrompts = await getCustomerPrompts(session.user.id);
          setPrompts(userPrompts);
        }
      } catch (error) {
        console.error("Failed to fetch prompts:", error);
      }
    }

    fetchPrompts();
  }, []);

  const handleCreatePrompt = async () => {
    try {
      setIsCreating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        throw new Error("Not authenticated");
      }

      const prompt = await createEmailPrompt(session.user.id, newPrompt);
      setPrompts((prev) => [...prev, prompt]);
      toast({
        title: "Prompt created",
        description: "Your new prompt has been saved",
      });
      setNewPrompt({ name: "", description: "", prompt: "" });
    } catch (error) {
      console.error("Failed to create prompt:", error);
      toast({
        title: "Error",
        description: "Failed to create prompt",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleTemplateSelect = (prompt: EmailPromptPayload) => {
    setSelectedTemplateId(prompt.id);
    onPromptSelect(prompt);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Email Processing Templates</h2>
          <p className="text-sm text-muted-foreground">
            Select a template to process your emails
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Create Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create Email Template</DialogTitle>
              <DialogDescription>
                Choose from our pre-built templates or create your own custom
                template for processing emails.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="examples">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="examples">Pre-built Templates</TabsTrigger>
                <TabsTrigger value="custom">Create Custom Template</TabsTrigger>
              </TabsList>

              <TabsContent value="examples" className="space-y-4">
                {EXAMPLE_PROMPTS.map((template) => (
                  <div
                    key={template.name}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setNewPrompt(template)}
                  >
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {template.description}
                    </p>
                    <Button variant="ghost" size="sm" className="mt-2">
                      Use this template
                    </Button>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="custom" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Template Name</label>
                    <Input
                      placeholder="e.g., Sales Email Analyzer"
                      value={newPrompt.name}
                      onChange={(e) =>
                        setNewPrompt((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      placeholder="What does this template do?"
                      value={newPrompt.description}
                      onChange={(e) =>
                        setNewPrompt((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Processing Instructions
                    </label>
                    <Textarea
                      placeholder="Enter detailed instructions for processing emails..."
                      value={newPrompt.prompt}
                      onChange={(e) =>
                        setNewPrompt((prev) => ({
                          ...prev,
                          prompt: e.target.value,
                        }))
                      }
                      className="h-48"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button onClick={handleCreatePrompt} disabled={isCreating}>
                {isCreating ? "Creating..." : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className={cn(
              "relative p-4 border rounded-lg transition-all",
              "hover:border-primary/50 hover:shadow-sm",
              selectedTemplateId === prompt.id
                ? "border-primary/70 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                : "hover:bg-gray-50 cursor-pointer"
            )}
            onClick={() => handleTemplateSelect(prompt)}
          >
            {selectedTemplateId === prompt.id && (
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                Active
              </div>
            )}
            <h4 className="font-medium">{prompt.name}</h4>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {prompt.description}
            </p>
            <Button
              variant={selectedTemplateId === prompt.id ? "default" : "ghost"}
              size="sm"
              className="mt-3"
            >
              {selectedTemplateId === prompt.id ? "Selected" : "Use template"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
