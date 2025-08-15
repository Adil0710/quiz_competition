"use client"

import * as React from "react"
import { Check, ChevronDown, GlobeIcon } from "lucide-react"
import { CircleFlag } from "react-circle-flags"
import { lookup } from "country-data-list"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type CountryData = {
  alpha2: string
  alpha3: string
  countryCallingCodes: string[]
  currencies: string[]
  emoji?: string
  ioc: string
  languages: string[]
  name: string
  status: string
}

interface CountrySelectProps {
  countryCode?: string // This will be the calling code like "+91", "+1", etc.
  onCountryChange?: (country: CountryData | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Get all countries with calling codes
const getAllCountries = (): CountryData[] => {
interface LookupCountry {
    alpha2: string
    alpha3: string
    countryCallingCodes: string[]
    currencies: string[]
    emoji?: string
    ioc: string
    languages: string[]
    name: string
    status: string
}

interface Lookup {
    countries: (query: { status: string }) => LookupCountry[]
}

return (lookup as Lookup)
    .countries({ status: "assigned" })
    .filter((country: LookupCountry) => country.countryCallingCodes && country.countryCallingCodes.length > 0)
    .sort((a: LookupCountry, b: LookupCountry) => a.name.localeCompare(b.name))
}

export function CountrySelect({
  countryCode = "+91", // Default to India
  onCountryChange,
  placeholder = "Select country...",
  className,
  disabled = false,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false)
  const countries = getAllCountries()

  // Find country by calling code (countryCode parameter contains the calling code like "+91")
  const selectedCountry = countries.find((country) => country.countryCallingCodes.includes(countryCode))

  const handleSelect = (country: CountryData) => {
    onCountryChange?.(country)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-fit justify-between border-none bg-transparent shadow-none p-0 h-auto hover:bg-transparent",
            className,
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-1">
            {selectedCountry ? (
              <>
                <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                  <CircleFlag countryCode={selectedCountry.alpha2.toLowerCase()} height={16} />
                </div>
                <span className="text-gray-900 text-sm font-medium">{countryCode}</span>
              </>
            ) : (
              <>
                <GlobeIcon size={16} />
                <span className="text-gray-900 text-sm font-medium">{countryCode}</span>
              </>
            )}
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.alpha2}
                  value={`${country.name} ${country.alpha2} ${country.countryCallingCodes[0]}`}
                  onSelect={() => handleSelect(country)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                      <CircleFlag countryCode={country.alpha2.toLowerCase()} height={16} />
                    </div>
                    <span className="flex-1 truncate">{country.name}</span>
                    <span className="text-muted-foreground text-sm">{country.countryCallingCodes[0]}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      countryCode === country.countryCallingCodes[0] ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
