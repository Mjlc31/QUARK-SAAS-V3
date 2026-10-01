import { useState, useEffect } from "react";
import { useApp as useQuarkApp } from "../../contexts/AppContext";
import { mergeSettings } from "@/lib/defaults";
import { supabase } from "@/lib/supabaseClient";

import { useCrm } from "../../contexts/CrmContext";
export function useApp() {
  const quark = useQuarkApp();
  const crm = useCrm();
  const [settings, setSettings] = useState(() => mergeSettings(null));
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("data").eq("id", 1).maybeSingle().then(({ data }) => {
      setSettings(mergeSettings(data?.data));
      setSettingsLoaded(true);
    });
  }, []);

  return { user: quark.user, settings, settingsLoaded, profiles: [], leads: crm.leads, addLead: crm.addLead };
}
