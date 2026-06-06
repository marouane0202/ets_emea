import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-gray-900 text-white",
        secondary: "bg-gray-100 text-gray-700",
        success: "bg-green-50 text-green-700 ring-1 ring-green-200",
        destructive: "bg-red-50 text-red-700 ring-1 ring-red-200",
        warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        outline: "border border-gray-300 text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
