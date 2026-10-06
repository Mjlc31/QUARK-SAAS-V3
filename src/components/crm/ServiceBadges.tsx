import { cx } from "@/components/ui";
import { servicesOf } from "@/lib/services";

/** Badges com os serviços do negócio (Solar, S.A.V.E, Manutenção…). */
export function ServiceBadges({ opp, max = 3, size = "sm", className }: { opp: { segment?: string | null; services?: string[] | null }; max?: number; size?: "xs" | "sm"; className?: string }) {
  const list = servicesOf(opp);
  if (!list.length)
    return <span className={cx("inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 ring-1 ring-white/10", className)}>Sem serviço</span>;
  const shown = list.slice(0, max);
  return (
    <div className={cx("flex flex-wrap items-center gap-1", className)}>
      {shown.map((s) => (
        <span
          key={s.id}
          className={cx(
            "inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset",
            size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
            s.badge,
          )}
        >
          <s.icon className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />
          {s.short}
        </span>
      ))}
      {list.length > max && <span className="text-[10px] font-semibold text-zinc-500">+{list.length - max}</span>}
    </div>
  );
}
