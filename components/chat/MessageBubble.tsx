import type { Message } from "@/lib/types";

export function MessageBubble({ message, compact }: { message: Message; compact?: boolean }) {
  const isUser = message.role === "user";
  const avatarSize = compact ? "h-6 w-6" : "h-7 w-7";

  return (
    <div className={compact ? "mb-5 flex gap-2.5" : "mb-[26px] flex gap-3.5"}>
      <div
        className={`${avatarSize} flex-shrink-0 rounded-md ${
          isUser ? "bg-border text-text-muted" : "bg-gradient-to-br from-aurora-1 via-aurora-2 to-aurora-3"
        } flex items-center justify-center text-[10px] font-semibold`}
      >
        {isUser ? "FE" : ""}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        {!compact && <div className="mb-1.5 text-[12.5px] font-semibold">{isUser ? "You" : "Aurora"}</div>}

        {message.toolTrace && (
          <div className="mb-3 rounded-md border border-border-soft bg-surface-raised px-3 py-2.5 font-mono text-[12px] text-text-muted">
            {message.toolTrace.map((line) => (
              <div key={line} className="py-0.5">
                {line}
              </div>
            ))}
          </div>
        )}

        {message.content && (
          <p className={compact ? "text-[13.5px] leading-relaxed text-text" : "text-[14.5px] leading-relaxed text-text"}>
            {message.content}
          </p>
        )}

        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <span
                key={i}
                className="rounded-md border border-border bg-surface-raised px-2.5 py-1 font-mono text-[11.5px] text-text-muted"
              >
                {c.label} {c.source}
              </span>
            ))}
          </div>
        )}

        {message.confidence === "high" && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-aurora-1/10 px-2.5 py-1 text-[11px] font-semibold text-aurora-1">
            <span className="h-1.5 w-1.5 rounded-full bg-aurora-1" />
            High confidence
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="mb-[26px] flex gap-3.5">
      <div className="h-7 w-7 flex-shrink-0 rounded-md bg-gradient-to-br from-aurora-1 via-aurora-2 to-aurora-3" />
      <div className="flex items-end gap-1 pt-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-faint"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
