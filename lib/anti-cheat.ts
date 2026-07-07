import type { ClipboardEvent, CSSProperties, MouseEvent } from 'react'

/**
 * Inline style that disables text selection in browsers that don't respect
 * the `select-none` Tailwind class consistently (notably Safari, via the
 * -webkit- prefixed property). Spread onto any element whose text should
 * not be selectable.
 */
export const NO_SELECT_STYLE: CSSProperties = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
}

/**
 * Event handlers that block copy, cut, and right-click context menu actions.
 * Spread onto a container element to prevent easy copy-paste of its contents.
 */
export const antiCheatHandlers = {
  onCopy: (e: ClipboardEvent<HTMLElement>) => e.preventDefault(),
  onCut: (e: ClipboardEvent<HTMLElement>) => e.preventDefault(),
  onContextMenu: (e: MouseEvent<HTMLElement>) => e.preventDefault(),
}
