import { useEffect, useState } from "react";
import { CaptureFunnel, type PublicCompany } from "@/components/capture/funnel";
import { TrackingScripts } from "@/components/capture/tracking";
import { supabase } from "@/lib/supabaseClient";

export default function PublicCapture() {
  const [company, setCompany] = useState<PublicCompany | null>(null);

  useEffect(() => {
    supabase.rpc("get_public_company").then(({ data }) => {
      if (data) setCompany(data as PublicCompany);
    });
  }, []);

  if (!company) {
    return <div className="flex min-h-screen items-center justify-center text-white bg-[#0E0A1C]">Carregando...</div>;
  }

  return (
    <div translate="no" className="notranslate">
      <TrackingScripts metaPixelId={company.metaPixelId} gaId={company.gaId} />
      <CaptureFunnel company={company} />
    </div>
  );
}
