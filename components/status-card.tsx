import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Circle, Loader2 } from "lucide-react";
import { ReactNode } from "react";

type Status = "connected" | "disconnected" | "idle";

interface StatusCardProps {
  title: string;
  status: Status;
  description: string | ReactNode;
  details: string;
  isLoading: boolean;
}

const statusConfig = {
  connected: {
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/20",
    label: "Connected",
  },
  disconnected: {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/20",
    label: "Disconnected",
  },
  idle: {
    icon: Circle,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-border",
    label: "Idle",
  },
};

export function StatusCard({
  title,
  status,
  description,
  details,
  isLoading,
}: StatusCardProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl p-6 border bg-gradient-to-br from-card to-card/50 backdrop-blur-sm",
        "hover:shadow-lg hover:shadow-primary/5 transition-all duration-300",
        "hover:border-border",
        config.borderColor
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        <div className={cn("p-3 rounded-xl", config.bgColor)}>
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          ) : (
            <Icon className={cn("w-5 h-5", config.color)} />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {status === "connected" && !isLoading && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
        )}
        <span className={cn("text-xs font-semibold", config.color)}>
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground">•</span>
        <span className="text-xs text-muted-foreground">{details}</span>
      </div>
    </div>
  );
}
