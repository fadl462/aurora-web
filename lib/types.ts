// These types mirror the schema in docs/05-database-design.md.
// Once a real API exists (Phase 3), these become the shared contract
// between frontend and backend rather than being redefined per component.

export type ApprovalStatus = "auto_approved" | "pending" | "approved" | "denied";
export type ToolTier = "read" | "low" | "medium" | "high";

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  confidence?: "high" | "moderate" | "low";
  toolTrace?: string[];
  createdAt: string;
}

export interface Citation {
  label: string;
  source: string;
}

export interface Conversation {
  id: string;
  title: string;
  projectId?: string;
  updatedAt: string;
  mode?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  threadCount: number;
}

export interface AgentTool {
  name: string;
  tier: ToolTier;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: AgentTool[];
  status: "active" | "idle";
  avatarLetter: string;
  avatarColorClass: string;
}

export interface AgentRun {
  id: string;
  agentId: string;
  title: string;
  status: "done" | "pending" | "running";
  meta: string;
  timeLabel: string;
}

export interface PendingApproval {
  id: string;
  agentId: string;
  tier: ToolTier;
  action: string;
}

export interface InboxApproval extends PendingApproval {
  agentName: string;
  agentAvatarLetter: string;
  agentAvatarColorClass: string;
  createdAt: string;
}
