export interface EmailHeader {
  name: string;
  value: string;
}

export interface Email {
  id: string;
  subject?: string;
  from?: string;
  snippet: string;
  threadId?: string;
  internalDate?: string;
  labelIds?: string[];
  payload: {
    headers: EmailHeader[];
    parts?: {
      mimeType: string;
      body: {
        data?: string;
      };
    }[];
    body?: {
      data?: string;
    };
  };
}

export interface EmailThread {
  messages: Email[];
}

export interface EmailViewProps {
  isOpen: boolean;
  onClose: () => void;
  email: Email | null;
  thread?: EmailThread;
}

export interface Summary {
  id: string;
  emailId: string;
  summary: EmailSummaryData;
  checkedActionItems: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailSummaryData {
  summary: string;
  sentiment?: string;
  main_points?: string[];
  action_items?: string[];
  key_dates?: Array<{
    date: string;
    description: string;
  }>;
  important_links?: string[];
} 