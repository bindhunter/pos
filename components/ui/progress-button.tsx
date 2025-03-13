'use client';

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ProgressButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  className?: string;
  progressClassName?: string;
}

export const ProgressButton = forwardRef<HTMLButtonElement, ProgressButtonProps>(
  ({ isLoading, loadingText, children, className, progressClassName, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <Button
          ref={ref}
          className={cn(
            "w-full relative overflow-hidden",
            isLoading && "cursor-not-allowed",
            disabled && "opacity-90 hover:opacity-90",
            className
          )}
          disabled={disabled || isLoading}
          {...props}
        >
          {isLoading && (
            <div 
              className={cn(
                "absolute inset-0",
                progressClassName
              )}
              style={{
                animation: 'progress-animation 1.5s infinite linear',
                backgroundImage: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)',
                backgroundSize: '200% 100%',
              }}
            />
          )}
          <span className="relative z-10">
            {isLoading && loadingText ? loadingText : children}
          </span>
        </Button>
      </div>
    );
  }
);

ProgressButton.displayName = "ProgressButton"; 