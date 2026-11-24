import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Splits a long report into calm, focused sections. */
export function ReportTabs({
  tabs,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
}) {
  return (
    <Tabs defaultValue={tabs[0]?.id ?? ""} className="space-y-6">
      <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
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
        <TabsContent key={t.id} value={t.id} className="mt-0 space-y-6">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
