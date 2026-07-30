import type { Agent, AgentRun, Citation, Conversation, InboxApproval, Message, PendingApproval, Project, ToolTier } from "./types";
import { getToken, refreshAccessToken } from "./auth";
import { formatRelativeTime } from "./format";

// Points at the real backend in aurora-api. No fallback to a fake
// localhost guess in production — this must be set explicitly via
// NEXT_PUBLIC_API_URL once deployed. Defaults to local dev only.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// --- Wire types: the backend's actual JSON shape, distinct from the
// frontend's internal Message type. Keeping these separate means a
// backend field rename doesn't silently propagate into every component
// that uses Message — it has to go through mapMessage() below.
interface WireCitation {
  source: string;
  page: number | null;
}

interface WireMessage {
  message_id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  model_used: string | null;
  citations: WireCitation[] | null;
  confidence: number | null;
  created_at: string;
}

interface WireConversation {
  id: string;
  title: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

function confidenceLabel(score: number | null): "high" | "moderate" | "low" | undefined {
  if (score === null) return undefined;
  if (score >= 0.75) return "high";
  if (score >= 0.4) return "moderate";
  return "low";
}

function mapCitations(citations: WireCitation[] | null): Citation[] | undefined {
  if (!citations || citations.length === 0) return undefined;
  return citations.map((c, i) => ({
    label: `[${i + 1}]`,
    source: c.page ? `${c.source} (p.${c.page})` : c.source,
  }));
}

function mapMessage(wire: WireMessage): Message {
  return {
    id: wire.message_id,
    conversationId: wire.conversation_id,
    role: wire.role,
    content: wire.content,
    citations: mapCitations(wire.citations),
    confidence: confidenceLabel(wire.confidence),
    createdAt: wire.created_at,
  };
}

function mapConversation(wire: WireConversation): Conversation {
  return {
    id: wire.id,
    title: wire.title ?? "Untitled conversation",
    projectId: wire.project_id ?? undefined,
    updatedAt: wire.updated_at,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  async function attempt(): Promise<Response> {
    const token = getToken();
    try {
      return await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init?.headers,
        },
      });
    } catch {
      throw new ApiError(
        `Couldn't reach the Aurora API at ${API_URL}. Is the backend running (uvicorn app.main:app)?`,
      );
    }
  }

  let response = await attempt();

  // A 401 here almost always means the short-lived access token expired
  // — not that the person needs to see a login screen. Silently refresh
  // once and retry the exact same request before giving up. If the
  // refresh itself fails (refresh token expired/revoked too), that's a
  // real "please log in again" — surface it as a 401 like any other.
  if (response.status === 401) {
    try {
      await refreshAccessToken();
      response = await attempt();
    } catch {
      // refresh failed — fall through and surface the original 401 below
    }
  }

  if (!response.ok) {
    let message = `Request to ${path} failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail?.error?.message) {
        message = body.detail.error.message;
      } else if (typeof body?.detail === "string") {
        message = body.detail;
      }
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export async function listConversations(): Promise<Conversation[]> {
  const wireConversations = await request<WireConversation[]>("/v1/conversations");
  return wireConversations.map(mapConversation);
}

export async function createConversation(title?: string, projectId?: string): Promise<string> {
  const conversation = await request<WireConversation>("/v1/conversations", {
    method: "POST",
    body: JSON.stringify({ title: title ?? null, project_id: projectId ?? null }),
  });
  return conversation.id;
}

export async function getConversation(id: string): Promise<Conversation> {
  const wire = await request<WireConversation>(`/v1/conversations/${id}`);
  return mapConversation(wire);
}

export async function listConversationsForProject(projectId?: string): Promise<Conversation[]> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
  const wireConversations = await request<WireConversation[]>(`/v1/conversations${query}`);
  return wireConversations.map(mapConversation);
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const wireMessages = await request<WireMessage[]>(`/v1/conversations/${conversationId}/messages`);
  return wireMessages.map(mapMessage);
}

export async function sendMessage(
  conversationId: string,
  content: string,
  mode?: string,
  model?: string,
): Promise<Message> {
  const wireMessage = await request<WireMessage>(`/v1/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, model: model ?? "auto", mode: mode ?? null }),
  });
  // Every send spends tokens — let the usage meter know immediately
  // rather than waiting for its next poll interval. Any component can
  // listen for this without api.ts needing to know the meter exists.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("aurora:usage-changed"));
  }
  return mapMessage(wireMessage);
}

// --- Agents ---

interface WireAgent {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  tools: { name: string; tier: ToolTier }[];
  status: "active" | "idle";
  avatar_letter: string;
  avatar_color_class: string;
}

interface WireAgentRun {
  id: string;
  agent_id: string;
  title: string;
  status: "done" | "pending" | "running";
  meta: string | null;
  created_at: string;
}

interface WirePendingApproval {
  id: string;
  agent_id: string;
  tier: ToolTier;
  action: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
  decided_at: string | null;
}

function mapAgent(wire: WireAgent): Agent {
  return {
    id: wire.id,
    name: wire.name,
    description: wire.description,
    systemPrompt: wire.system_prompt,
    tools: wire.tools,
    status: wire.status,
    avatarLetter: wire.avatar_letter,
    avatarColorClass: wire.avatar_color_class,
  };
}

function mapAgentRun(wire: WireAgentRun): AgentRun {
  return {
    id: wire.id,
    agentId: wire.agent_id,
    title: wire.title,
    status: wire.status,
    meta: wire.meta ?? "",
    timeLabel: formatRelativeTime(wire.created_at),
  };
}

function mapPendingApproval(wire: WirePendingApproval): PendingApproval {
  return {
    id: wire.id,
    agentId: wire.agent_id,
    tier: wire.tier,
    action: wire.action,
  };
}

export async function listAgents(): Promise<Agent[]> {
  const wireAgents = await request<WireAgent[]>("/v1/agents");
  return wireAgents.map(mapAgent);
}

export async function createAgent(input: {
  name: string;
  description: string;
  systemPrompt: string;
  tools?: { name: string; tier: ToolTier }[];
}): Promise<Agent> {
  const wireAgent = await request<WireAgent>("/v1/agents", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      system_prompt: input.systemPrompt,
      tools: input.tools ?? [],
    }),
  });
  return mapAgent(wireAgent);
}

export async function getAgent(agentId: string): Promise<Agent> {
  const wireAgent = await request<WireAgent>(`/v1/agents/${agentId}`);
  return mapAgent(wireAgent);
}

export async function listAgentRuns(agentId: string): Promise<AgentRun[]> {
  const wireRuns = await request<WireAgentRun[]>(`/v1/agents/${agentId}/runs`);
  return wireRuns.map(mapAgentRun);
}

export async function listPendingApprovals(agentId: string): Promise<PendingApproval[]> {
  const wireApprovals = await request<WirePendingApproval[]>(`/v1/agents/${agentId}/approvals`);
  return wireApprovals.map(mapPendingApproval);
}

export async function decideApproval(
  agentId: string,
  approvalId: string,
  decision: "approve" | "deny",
): Promise<void> {
  await request(`/v1/agents/${agentId}/approvals/${approvalId}/${decision}`, { method: "POST" });
}

// --- Inbox (cross-agent approvals — backs the TopBar bell) ---

interface WireInboxApproval extends WirePendingApproval {
  agent_name: string;
  agent_avatar_letter: string;
  agent_avatar_color_class: string;
}

function mapInboxApproval(wire: WireInboxApproval): InboxApproval {
  return {
    id: wire.id,
    agentId: wire.agent_id,
    tier: wire.tier,
    action: wire.action,
    agentName: wire.agent_name,
    agentAvatarLetter: wire.agent_avatar_letter,
    agentAvatarColorClass: wire.agent_avatar_color_class,
    createdAt: wire.created_at,
  };
}

export async function listInboxApprovals(): Promise<InboxApproval[]> {
  const wireApprovals = await request<WireInboxApproval[]>("/v1/agents/approvals");
  return wireApprovals.map(mapInboxApproval);
}

// --- Projects ---

interface WireProject {
  id: string;
  name: string;
  color: string;
  created_at: string;
  thread_count: number;
}

function mapProject(wire: WireProject): Project {
  return {
    id: wire.id,
    name: wire.name,
    color: wire.color,
    threadCount: wire.thread_count,
  };
}

export async function listProjects(): Promise<Project[]> {
  const wireProjects = await request<WireProject[]>("/v1/projects");
  return wireProjects.map(mapProject);
}

export async function getProject(id: string): Promise<Project> {
  const wire = await request<WireProject>(`/v1/projects/${id}`);
  return mapProject(wire);
}

export async function createProject(name: string, color?: string): Promise<Project> {
  const wire = await request<WireProject>("/v1/projects", {
    method: "POST",
    body: JSON.stringify({ name, color: color ?? "bg-aurora-2" }),
  });
  return mapProject(wire);
}

// --- Documents ---

interface WireDocument {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Doc {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

function mapDocument(wire: WireDocument): Doc {
  return { id: wire.id, title: wire.title, content: wire.content, updatedAt: wire.updated_at };
}

export async function listDocuments(projectId?: string): Promise<Doc[]> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
  const wireDocs = await request<WireDocument[]>(`/v1/documents${query}`);
  return wireDocs.map(mapDocument);
}

export async function createDocument(title?: string, content?: string, projectId?: string): Promise<Doc> {
  const wireDoc = await request<WireDocument>("/v1/documents", {
    method: "POST",
    body: JSON.stringify({ title: title ?? "Untitled document", content: content ?? "", project_id: projectId ?? null }),
  });
  return mapDocument(wireDoc);
}

export async function updateDocument(id: string, changes: { title?: string; content?: string }): Promise<Doc> {
  const wireDoc = await request<WireDocument>(`/v1/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(changes),
  });
  return mapDocument(wireDoc);
}

// --- Document version history ---

export interface DocumentVersion {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface WireDocumentVersion {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

function mapDocumentVersion(wire: WireDocumentVersion): DocumentVersion {
  return { id: wire.id, title: wire.title, content: wire.content, createdAt: wire.created_at };
}

export async function listDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const wireVersions = await request<WireDocumentVersion[]>(`/v1/documents/${documentId}/versions`);
  return wireVersions.map(mapDocumentVersion);
}

export async function restoreDocumentVersion(documentId: string, versionId: string): Promise<Doc> {
  const wireDoc = await request<WireDocument>(`/v1/documents/${documentId}/versions/${versionId}/restore`, {
    method: "POST",
  });
  return mapDocument(wireDoc);
}

// --- Generated Documents (real .pptx/.docx/.xlsx from a prompt) ---

export type GeneratedDocFormat = "pptx" | "docx" | "xlsx";

interface WireGeneratedDocument {
  id: string;
  title: string;
  format: GeneratedDocFormat;
  prompt: string;
  is_placeholder: boolean;
  size_bytes: number;
  created_at: string;
}

export interface GeneratedDoc {
  id: string;
  title: string;
  format: GeneratedDocFormat;
  prompt: string;
  isPlaceholder: boolean;
  sizeBytes: number;
  createdAt: string;
}

function mapGeneratedDocument(wire: WireGeneratedDocument): GeneratedDoc {
  return {
    id: wire.id,
    title: wire.title,
    format: wire.format,
    prompt: wire.prompt,
    isPlaceholder: wire.is_placeholder,
    sizeBytes: wire.size_bytes,
    createdAt: wire.created_at,
  };
}

export async function listGeneratedDocuments(): Promise<GeneratedDoc[]> {
  const wireDocs = await request<WireGeneratedDocument[]>("/v1/generated-documents");
  return wireDocs.map(mapGeneratedDocument);
}

export async function createGeneratedDocument(prompt: string, format: GeneratedDocFormat): Promise<GeneratedDoc> {
  const wireDoc = await request<WireGeneratedDocument>("/v1/generated-documents", {
    method: "POST",
    body: JSON.stringify({ prompt, format }),
  });
  return mapGeneratedDocument(wireDoc);
}

// Binary download needs a real fetch (not the JSON `request` helper) —
// same auth-header pattern as extractFileText, but reading the response
// as a blob and triggering a real browser download rather than parsing
// JSON out of it.
export async function downloadGeneratedDocument(id: string, filename: string): Promise<void> {
  async function attempt(): Promise<Response> {
    const token = getToken();
    try {
      return await fetch(`${API_URL}/v1/generated-documents/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {
      throw new ApiError(`Couldn't reach the Aurora API at ${API_URL}.`);
    }
  }

  let response = await attempt();
  if (response.status === 401) {
    try {
      await refreshAccessToken();
      response = await attempt();
    } catch {
      // refresh failed — fall through, the 401 below surfaces as-is
    }
  }

  if (!response.ok) {
    throw new ApiError(`Couldn't download ${filename}.`, response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Usage ---

export interface Usage {
  balance: number;
  startingBalance: number;
  percentRemaining: number;
}

interface WireUsage {
  balance: number;
  starting_balance: number;
  percent_remaining: number;
}

export async function getUsage(): Promise<Usage> {
  const wire = await request<WireUsage>("/v1/usage");
  return { balance: wire.balance, startingBalance: wire.starting_balance, percentRemaining: wire.percent_remaining };
}

// --- Current user ---

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  planTier: string;
  createdAt: string;
}

interface WireUser {
  id: string;
  email: string;
  name: string | null;
  plan_tier: string;
  created_at: string;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const wire = await request<WireUser>("/v1/auth/me");
  return { id: wire.id, email: wire.email, name: wire.name, planTier: wire.plan_tier, createdAt: wire.created_at };
}

export async function updateCurrentUser(changes: { name: string }): Promise<CurrentUser> {
  const wire = await request<WireUser>("/v1/auth/me", {
    method: "PATCH",
    body: JSON.stringify({ name: changes.name }),
  });
  return { id: wire.id, email: wire.email, name: wire.name, planTier: wire.plan_tier, createdAt: wire.created_at };
}

// --- Billing ---

export interface Plan {
  id: string;
  name: string;
  monthlyPriceUsd: number;
  tokenAllowance: number;
  purchasable: boolean;
}

interface WirePlan {
  id: string;
  name: string;
  monthly_price_usd: number;
  token_allowance: number;
  purchasable: boolean;
}

export async function listPlans(): Promise<Plan[]> {
  const wirePlans = await request<WirePlan[]>("/v1/billing/plans");
  return wirePlans.map((p) => ({
    id: p.id,
    name: p.name,
    monthlyPriceUsd: p.monthly_price_usd,
    tokenAllowance: p.token_allowance,
    purchasable: p.purchasable,
  }));
}

export async function createCheckoutSession(planId: string): Promise<string> {
  const wire = await request<{ checkout_url: string }>("/v1/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan_id: planId }),
  });
  return wire.checkout_url;
}

export async function createBillingPortalSession(): Promise<string> {
  const wire = await request<{ portal_url: string }>("/v1/billing/portal");
  return wire.portal_url;
}

// --- Sign-in activity (real device + best-effort location, never raw IP/UA) ---

export interface LoginEvent {
  id: string;
  deviceLabel: string;
  locationLabel: string | null;
  createdAt: string;
}

interface WireLoginEvent {
  id: string;
  device_label: string;
  location_label: string | null;
  created_at: string;
}

export async function listLoginEvents(): Promise<LoginEvent[]> {
  const wireEvents = await request<WireLoginEvent[]>("/v1/auth/sessions");
  return wireEvents.map((w) => ({
    id: w.id,
    deviceLabel: w.device_label,
    locationLabel: w.location_label,
    createdAt: w.created_at,
  }));
}

export async function signOutDevice(eventId: string): Promise<void> {
  await request(`/v1/auth/sessions/${eventId}`, { method: "DELETE" });
}

// --- File extraction ---

export interface ExtractedFile {
  filename: string;
  text: string;
  truncated: boolean;
  charCount: number;
}

interface WireExtractedFile {
  filename: string;
  text: string;
  truncated: boolean;
  char_count: number;
}

export async function extractFileText(file: File): Promise<ExtractedFile> {
  const formData = new FormData();
  formData.append("file", file);

  async function attempt(): Promise<Response> {
    const token = getToken();
    try {
      return await fetch(`${API_URL}/v1/files/extract`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
    } catch {
      throw new ApiError(`Couldn't reach the Aurora API at ${API_URL}.`);
    }
  }

  let response = await attempt();
  if (response.status === 401) {
    try {
      await refreshAccessToken();
      response = await attempt();
    } catch {
      // refresh failed — fall through, the error below surfaces as-is
    }
  }

  if (!response.ok) {
    let message = `Couldn't read ${file.name}.`;
    try {
      const body = await response.json();
      if (body?.detail?.error?.message) message = body.detail.error.message;
    } catch {
      // keep default message
    }
    throw new ApiError(message, response.status);
  }

  const wire = (await response.json()) as WireExtractedFile;
  return { filename: wire.filename, text: wire.text, truncated: wire.truncated, charCount: wire.char_count };
}
