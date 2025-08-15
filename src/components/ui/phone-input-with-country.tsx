"use client"

import * as React from "react"
import { CountrySelect, type CountryData } from "./country-select"
import { PhoneIcon } from "@/helper/icons"
import { cn } from "@/lib/utils"
import { getCountryCodeFromTimezone } from "@/lib/timezone-helper"
import { Separator } from "./separator"

interface PhoneInputWithCountryProps {
  countryCode?: string
  phone?: string
  onCountryCodeChange?: (countryCode: string) => void
  onPhoneChange?: (phone: string) => void
  onCountryChange?: (country: CountryData | undefined) => void
  phoneError?: boolean
  countryCodeError?: boolean
  disabled?: boolean
  className?: string
}

export function PhoneInputWithCountry({
  countryCode,
  phone = "",
  onCountryCodeChange,
  onPhoneChange,
  onCountryChange,
  phoneError = false,
  countryCodeError = false,
  disabled = false,
  className,
}: PhoneInputWithCountryProps) {
  const [isFocused, setIsFocused] = React.useState(false)
  const [hasValue, setHasValue] = React.useState(false)

  // Set default country code based on region if not provided
  const defaultCountryCode = React.useMemo(() => {
    return countryCode || getCountryCodeFromTimezone()
  }, [countryCode])

  // Check if the input has a value
  React.useEffect(() => {
    const isEmpty = !phone || phone.trim() === ""
    setHasValue(!isEmpty)
  }, [phone])

  const handleCountryDataChange = (country: CountryData | undefined) => {
    if (country && country.countryCallingCodes.length > 0) {
      onCountryCodeChange?.(country.countryCallingCodes[0])
    }
    onCountryChange?.(country)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "") // Only allow digits
    if (value.length <= 10) {
      onPhoneChange?.(value)
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    const isEmpty = !e.target.value || e.target.value.trim() === ""
    setHasValue(!isEmpty)
  }

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex h-12 items-center gap-3 px-3 bg-[#ddeafd80] rounded-[13px]",
          (phoneError || countryCodeError) && "border border-red-500",
        )}
      >
        <div className="flex-shrink-0 text-[#9ebddb]">
          <PhoneIcon />
        </div>

        <div className="flex-shrink-0 mt-1">
          <CountrySelect
            countryCode={defaultCountryCode}
            onCountryChange={handleCountryDataChange}
            disabled={disabled}
            className="border-none bg-transparent shadow-none p-0 h-auto"
          />
        </div>
        <Separator orientation="vertical" className=" h-6 bg-[#9EBDDC80]"/>

        <div className="relative flex-grow">
          <label
            className={cn(
              "absolute left-0 font-['Poppins',Helvetica] transform translate-y-5 font-medium transition-all duration-200 pointer-events-none",
              isFocused || hasValue ? "transform translate-y-3 text-[10px] text-[#9EBDDC]" : "text-[#9ebddb] text-sm",
            )}
          >
            Phone Number
          </label>
          <input
            type="text"
            value={phone}
            onChange={handlePhoneChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            maxLength={10}
            className="w-full border-0 bg-transparent shadow-none p-0 h-12 mt-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none outline-none border-none font-['Poppins',Helvetica] font-medium text-gray-900 text-sm autofill:bg-transparent autofill:shadow-[inset_0_0_0px_1000px_transparent]"
            style={{
              WebkitBoxShadow: "inset 0 0 0px 1000px transparent",
              WebkitTextFillColor: "#111827",
              transition: "background-color 5000s ease-in-out 0s",
            }}
          />
        </div>
      </div>
    </div>
  )
}
