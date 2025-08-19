import { Session } from "@/types";
import { Badge } from "@/components/ui/badge";

interface SessionObservationsProps {
  observations: Session["observations"];
}

export function SessionObservations({ observations }: SessionObservationsProps) {
  if (!observations || observations.length === 0) {
    return null;
  }

  return (
    <div className="border-border bg-surface rounded-lg border p-6">
      <h2 className="font-display mb-4 text-xl font-semibold">Observations</h2>
      <div className="space-y-3">
        {observations.map((obs, index) => (
          <div key={index} className="border border-border/50 rounded-lg p-4 space-y-2 bg-background/50">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{obs.observation}</p>
              <div className="flex gap-1 flex-shrink-0">
                <Badge 
                  variant={obs.confidence === "high" ? "default" : obs.confidence === "medium" ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {obs.confidence}
                </Badge>
                <Badge 
                  variant={obs.urgency === "high" ? "destructive" : obs.urgency === "medium" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {obs.urgency}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-foreground-secondary">
                <span className="font-medium text-foreground">Why:</span> {obs.explanation}
              </p>
              <p className="text-sm text-foreground-secondary">
                <span className="font-medium text-foreground">Suggestion:</span> {obs.suggestion}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}