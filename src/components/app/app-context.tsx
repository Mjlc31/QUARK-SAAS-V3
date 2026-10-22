import { useState, useEffect } from "react";
import { useApp as useQuarkApp } from "../../contexts/AppContext";
import { mergeSettings } from "@/lib/defaults";
import { supabase } from "@/lib/supabaseClient";

import { useCrm } from "../../contexts/CrmContext";
export function useApp() {
  const quark = useQuarkApp();
  const crm = useCrm();
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem("quark_settings_cache");
      if (cached) return mergeSettings(JSON.parse(cached));
    } catch {}
    return mergeSettings(null);
  });
  const [settingsLoaded, setSettingsLoaded] = useState(() => {
    try {
      return !!localStorage.getItem("quark_settings_cache");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const timeoutPromise = new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 1500)
        );
        const { data, error } = await Promise.race([
          supabase.from("settings").select("data").eq("id", 1).maybeSingle(),
          timeoutPromise,
        ]);
        if (active) {
          if (!error && data?.data) {
            setSettings(mergeSettings(data.data));
            localStorage.setItem("quark_settings_cache", JSON.stringify(data.data));
          } else {
            setSettings(prev => prev || mergeSettings(null));
          }
          setSettingsLoaded(true);
        }
      } catch {
        if (active) {
          setSettings(prev => prev || mergeSettings(null));
          setSettingsLoaded(true);
        }
      }
    };

    fetchSettings();
    return () => {
      active = false;
    };
  }, []);

  return { user: quark.user, settings, settingsLoaded, profiles: [], leads: crm.leads, addLead: crm.addLead };
}
