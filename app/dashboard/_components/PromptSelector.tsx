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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createEmailPrompt, getCustomerPrompts } from "../actions";
import type { EmailPromptPayload } from "../actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/auth/supabase/client";

const supabase = createClient();

const EXAMPLE_PROMPTS = [
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

  return (
    <div className="space-y-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button>Create New Prompt</Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Email Processing Prompt</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="custom">
            <TabsList>
              <TabsTrigger value="custom">Custom Prompt</TabsTrigger>
              <TabsTrigger value="examples">Example Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="custom" className="space-y-4">
              <Input
                placeholder="Prompt Name"
                value={newPrompt.name}
                onChange={(e) =>
                  setNewPrompt((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <Input
                placeholder="Description"
                value={newPrompt.description}
                onChange={(e) =>
                  setNewPrompt((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
              <Textarea
                placeholder="System Prompt"
                value={newPrompt.prompt}
                onChange={(e) =>
                  setNewPrompt((prev) => ({ ...prev, prompt: e.target.value }))
                }
                className="h-48"
              />
            </TabsContent>

            <TabsContent value="examples" className="space-y-4">
              {EXAMPLE_PROMPTS.map((template) => (
                <div
                  key={template.name}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => setNewPrompt(template)}
                >
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-gray-600">
                    {template.description}
                  </p>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button onClick={handleCreatePrompt} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 gap-4">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={() => onPromptSelect(prompt)}
          >
            <h4 className="font-medium">{prompt.name}</h4>
            <p className="text-sm text-gray-600">{prompt.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
