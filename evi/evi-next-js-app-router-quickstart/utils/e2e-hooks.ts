const ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_E2E_HOOKS &&
  process.env.NEXT_PUBLIC_ENABLE_E2E_HOOKS !== "false";

declare global {
  interface Window {
    __voiceEvents?: unknown[];
    __voiceStatus?: string;
    __sendSessionSettings?: (settings: Record<string, unknown>) => void;
  }
}

function getWindow(): Window | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window;
}

export function recordVoiceEvent(event: unknown) {
  if (!ENABLED) return;
  const win = getWindow();
  if (!win) return;
  win.__voiceEvents = win.__voiceEvents ?? [];
  win.__voiceEvents.push(event);
}

export function trackVoiceStatus(status: string) {
  if (!ENABLED) return;
  const win = getWindow();
  if (!win) return;
  win.__voiceStatus = status;
}
