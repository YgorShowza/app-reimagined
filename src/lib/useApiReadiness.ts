import { useEffect, useState } from "react";
import { checkSegempatApiReadiness, isSegempatApiConfigured } from "@/lib/backend/api-client";

export type ApiReadinessStatus = "preview" | "checking" | "ready" | "unavailable";

export function useApiReadiness() {
  const configured = isSegempatApiConfigured();
  const [status, setStatus] = useState<ApiReadinessStatus>(() => (configured ? "checking" : "preview"));

  useEffect(() => {
    if (!configured) {
      setStatus("preview");
      return undefined;
    }

    let active = true;

    const check = async () => {
      const ready = await checkSegempatApiReadiness();
      if (active) setStatus(ready ? "ready" : "unavailable");
    };

    const handleOnline = () => {
      setStatus("checking");
      void check();
    };
    const handleOffline = () => setStatus("unavailable");

    void check();
    const interval = window.setInterval(() => void check(), 30_000);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [configured]);

  return status;
}
