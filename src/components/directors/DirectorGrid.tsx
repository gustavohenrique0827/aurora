import { DIRECTORS } from "@jarvis/shared";
import { DirectorCard } from "./DirectorCard";
import { useDashboardData } from "../../hooks/useDashboardData";

export function DirectorGrid() {
  const { snapshot } = useDashboardData();
  const workflows = snapshot?.n8n.data?.workflows;

  return (
    <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-5">
      {DIRECTORS.map((director) => {
        const wf = workflows?.find((w) => w.name.toLowerCase().includes(director.name.split(" ")[0].toLowerCase()));
        return <DirectorCard key={director.id} director={director} active={workflows ? wf?.active ?? false : undefined} />;
      })}
    </div>
  );
}
