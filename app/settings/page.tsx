import { Suspense } from "react";
import { SettingsContent } from "@/components/settings/SettingsContent";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="px-8 pt-11 text-[13px] text-text-faint">Loading…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
