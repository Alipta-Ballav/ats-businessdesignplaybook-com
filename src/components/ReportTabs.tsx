import { createContext, useContext, useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Splits a long report into calm, focused sections. */
const QueueNavigation = createContext<(() => void) | null>(null);
export function openPriorityQueue() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.dispatchEvent(new Event("ft-open-priority-queue"));
    const queue = [...document.querySelectorAll<HTMLElement>("[data-priority-queue]")].find((element) => element.getClientRects().length > 0);
    queue?.focus({ preventScroll: true });
    if (queue) {
      const headerHeight = document.querySelector("header.sticky")?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: window.scrollY + queue.getBoundingClientRect().top - headerHeight - 16, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  }));
}
export function useQueueNavigation() {
  return useContext(QueueNavigation) ?? openPriorityQueue;
}
export function ReportTabs({
  tabs,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
}) {
  const [selected, setSelected] = useState(tabs[0]?.id ?? "");
  return (
    <QueueNavigation.Provider value={() => { setSelected("fix"); openPriorityQueue(); }}>
    <Tabs value={selected} onValueChange={setSelected} className="space-y-6">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-x-6 gap-y-2 rounded-none border-b bg-transparent p-0">
        {tabs.map((t) => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.id} value={t.id} forceMount className="mt-0 space-y-6 data-[state=inactive]:hidden">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
    </QueueNavigation.Provider>
  );
}
