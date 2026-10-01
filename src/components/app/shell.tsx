export function useQuick() {
  return { openLead: (id: any, opts: any) => console.log("Open lead", id, opts) };
}
