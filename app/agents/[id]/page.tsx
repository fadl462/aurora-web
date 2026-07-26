"use client";

import { use } from "react";
import { AgentConsoleContent } from "@/components/agents/AgentConsoleContent";

export default function AgentConsolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AgentConsoleContent agentId={id} />;
}
