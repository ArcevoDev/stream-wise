import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Thin token-styled alert. Facet doesn't ship an Alert primitive, so this
 * uses the semantic tokens directly (bg-destructive/10, text-destructive…).
 */
const alertVariants = {
  default: "border-border bg-muted text-foreground",
  info: "border-border bg-primary/10 text-primary",
  warning: "border-border bg-warning/10 text-warning",
  destructive: "border-border bg-destructive/10 text-destructive",
  success: "border-border bg-success/10 text-success",
} as const;

type AlertVariant = keyof typeof alertVariants;

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 flex items-start gap-3 text-sm",
        alertVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />;
}
