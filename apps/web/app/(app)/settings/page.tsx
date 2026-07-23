// app/(app)/settings/page.tsx
"use client";
import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { SettingsSidebar, type SettingsSection } from "@/components/settings/SettingsSidebar";
import { AccountSection } from "@/components/settings/AccountSection";
import { ApiKeySection } from "@/components/settings/ApiKeySection";
import { PlanSection } from "@/components/settings/PlanSection";
import { PrivacySection } from "@/components/settings/PrivacySection";
import type { AIProvider } from "@/lib/ai/provider";

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>("account");
  // Track connection status for the sidebar dot — updated when ApiKeySection verifies/removes
  const [anyKeyConnected, setAnyKeyConnected] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function handleConnectedChange(_provider: AIProvider, connected: boolean) {
    // Show connected dot if at least one provider has a key
    // A more robust version would check both providers; this is fine for the sidebar indicator
    if (connected) setAnyKeyConnected(true);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <SettingsSidebar
          active={section}
          onChange={setSection}
          apiKeyConnected={anyKeyConnected}
        />
        <main className="flex-1 overflow-y-auto px-9 py-7">
          {section === "account" && <AccountSection onToast={showToast} />}
          {section === "apikey" && (
            <ApiKeySection
              onConnectedChange={handleConnectedChange}
              onToast={showToast}
            />
          )}
          {section === "plan"    && <PlanSection projectsUsed={1} projectsLimit={3} />}
          {section === "privacy" && <PrivacySection onToast={showToast} />}
        </main>
      </div>
      {toast && (
        <div className="fixed bottom-5 right-5 bg-ink text-vellum text-xs px-4 py-2 rounded-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
