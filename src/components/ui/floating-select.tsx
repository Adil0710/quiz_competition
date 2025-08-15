"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, User } from "lucide-react";
import { Label } from "./label";

interface FloatingSelectProps {
  label: string;
  icon?: ReactNode;
  options: { value: string; label: string | Array<string> }[];
  value?: string;
  onChange: (value: string) => void;
  error?: boolean;
  detailed?: boolean;
  className?: string;
}

export function FloatingSelect({
  label,
  icon,
  options,
  value,
  onChange,
  error,
  detailed,
  className,
  ...props
}: FloatingSelectProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== "";

  // Get the display value for the selected option
  const getDisplayValue = () => {
    if (!value) return ""
    const selectedOption = options.find((option) => option.value === value)
    if (!selectedOption) return ""

    if (detailed && Array.isArray(selectedOption.label)) {
      return selectedOption.label[0] // Show only the main title
    }
    return selectedOption.label as string
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "flex h-12 items-center gap-3 px-3 bg-[#ddeafd80] rounded-[13px]",
          error && "border border-red-500",
          className
        )}
      >
        {icon && <div className="flex-shrink-0 text-[#9ebddb]">{icon}</div>}
        <div className="relative flex-grow">
          <label
            className={cn(
              "absolute left-0 font-['Poppins',Helvetica] font-medium transform translate-y-5 transition-all duration-200 pointer-events-none",
              isFocused || hasValue
                ? "transform translate-y-2 text-[10px] text-[#9EBDDC]"
                : "text-[#9ebddb] text-sm"
            )}
          >
            {label}
          </label>
          <Select
            value={value}
            onValueChange={(val) => {
              onChange(val);
              setIsFocused(true);
            }}
            onOpenChange={(open) => {
              if (open) setIsFocused(true);
              else setIsFocused(hasValue);
            }}
          >
            <SelectTrigger className="border-0 bg-transparent shadow-none p-0 h-12 mt-2 focus:ring-0 focus:ring-offset-0 [&>span]:font-['Poppins',Helvetica] [&>span]:font-medium [&>span]:text-sm [&>svg]:text-[#9ebddb]">
              <SelectValue>{getDisplayValue()}</SelectValue>
            </SelectTrigger>
            <SelectContent className="[&_[data-state=checked]]:text-[#2F80E9]">
              {options.map((option, index) =>
                detailed ? (
                  <SelectItem key={option.value} value={option.value} className="group focus:bg-gray-50" >
                    <div className={cn(
                        "flex items-center space-x-3 p-3 w-[26.5rem] border rounded-lg transition-colors",
                        "",
                        value === option.value ? "border-[#2F80E9] border-2 hover:border-[#2F80E9]" : "border-gray-200 group-hover:border-[#888888]",
                      )}>
                      {Array.isArray(option.label) && option.label[0] === "Individual Account" ? (
                        <User className={cn("h-5 w-5", value === option.value ? "text-[#2F80E9]" : "text-gray-600")} />
                      ) : (
                        <Building2
                          className={cn("h-5 w-5", value === option.value ? "text-[#2F80E9]" : "text-gray-600")}
                        />
                      )}
                      <div className="flex-1">
                        <Label className="font-medium text-sm cursor-pointer">{option.label[0]}</Label>
                        {Array.isArray(option.label) && option.label[1] && (
                          <p className={cn("text-xs", value === option.value ? "text-[#2F80E9]/80" : "text-gray-500")}>
                            {option.label[1]}
                          </p>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ) : (
                   <SelectItem key={option.value} value={option.value}>
                    {Array.isArray(option.label) ? option.label[0] : option.label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
