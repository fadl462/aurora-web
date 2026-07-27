import { ChatThread } from "@/components/chat/ChatThread";

export default async function ChatConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatThread existingConversationId={id} />;
}
