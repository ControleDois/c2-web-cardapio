import { useEffect, useRef } from 'react'

interface CategoryNavProps {
  categories: { id: string; name: string }[]
  activeId: string | null
  onSelect: (id: string) => void
}

export function CategoryNav({ categories, activeId, onSelect }: CategoryNavProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activeId) return
    const button = listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(activeId)}"]`)
    button?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activeId])

  return (
    <div ref={listRef} className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5">
      {categories.map((category) => {
        const active = category.id === activeId
        return (
          <button
            key={category.id}
            type="button"
            data-id={category.id}
            onClick={() => onSelect(category.id)}
            className={`flex-none rounded-full px-4 py-2 text-[13px] font-bold whitespace-nowrap transition ${
              active ? 'bg-[var(--brand)] text-white' : 'bg-[var(--page)] text-[var(--ink-soft)]'
            }`}
          >
            {category.name}
          </button>
        )
      })}
    </div>
  )
}
