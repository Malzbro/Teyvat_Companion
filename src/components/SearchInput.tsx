import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  autoFocus,
}: SearchInputProps) {
  return (
    <label className="flex min-h-12 items-center gap-2 rounded-full border border-line bg-surface px-4 text-muted focus-within:border-accent/60">
      <Search size={18} aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={placeholder}
        className="w-full bg-transparent text-base text-ink placeholder:text-faint focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="grid size-8 place-items-center rounded-full hover:bg-surface-strong"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </label>
  )
}
