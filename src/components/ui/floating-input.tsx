"use client"

import type React from "react"

import { useState, useEffect, type InputHTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: ReactNode
  error?: boolean
  rightElement?: ReactNode
}

export function FloatingInput({ label, icon, className, error, rightElement, ...props }: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(false)

  // Check if the input has a value whenever the value prop changes
  useEffect(() => {
    const value = props.value !== undefined ? String(props.value) : ""
    const isEmpty = value.trim() === ""
    setHasValue(!isEmpty)
  }, [props.value])

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    // Check if the input is actually empty
    const isEmpty = !e.target.value || e.target.value.trim() === ""
    setHasValue(!isEmpty)

    // Call the original onBlur if provided
    if (props.onBlur) {
      props.onBlur(e)
    }
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "flex h-12 items-center gap-3 px-3 bg-[#ddeafd80] rounded-[13px]",
          error && "border border-red-500",
          className,
        )}
      >
        {icon && <div className="flex-shrink-0 text-[#9ebddb]">{icon}</div>}
        <div className="relative flex-grow">
          <label
            className={cn(
              "absolute left-0 font-['Poppins',Helvetica] transform translate-y-5 font-medium transition-all duration-200 pointer-events-none",
              isFocused || hasValue ? "transform translate-y-3 text-[10px] text-[#9EBDDC]" : "text-[#9ebddb] text-sm",
            )}
          >
            {label}
          </label>
          <input
            {...props}
            className="w-full border-0 bg-transparent shadow-none p-0 h-12 mt-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none outline-none border-none font-['Poppins',Helvetica] font-medium text-gray-900 text-sm autofill:bg-transparent autofill:shadow-[inset_0_0_0px_1000px_transparent]"
             style={{
              WebkitBoxShadow: "inset 0 0 0px 1000px transparent",
              WebkitTextFillColor: "#111827",
              transition: "background-color 5000s ease-in-out 0s",
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>
        {rightElement && <div className="flex-shrink-0 mt-1">{rightElement}</div>}
      </div>
    </div>
  )
}
