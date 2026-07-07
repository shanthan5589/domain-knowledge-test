import type { ClipboardEvent, MouseEvent } from 'react'
import { NO_SELECT_STYLE, antiCheatHandlers } from '@/lib/anti-cheat'

describe('lib/anti-cheat', () => {
  it('exposes a style object that disables text selection', () => {
    expect(NO_SELECT_STYLE).toEqual({
      userSelect: 'none',
      WebkitUserSelect: 'none',
    })
  })

  it('onCopy calls preventDefault on the event', () => {
    const preventDefault = jest.fn()
    antiCheatHandlers.onCopy({ preventDefault } as unknown as ClipboardEvent<HTMLElement>)
    expect(preventDefault).toHaveBeenCalledTimes(1)
  })

  it('onCut calls preventDefault on the event', () => {
    const preventDefault = jest.fn()
    antiCheatHandlers.onCut({ preventDefault } as unknown as ClipboardEvent<HTMLElement>)
    expect(preventDefault).toHaveBeenCalledTimes(1)
  })

  it('onContextMenu calls preventDefault on the event', () => {
    const preventDefault = jest.fn()
    antiCheatHandlers.onContextMenu({ preventDefault } as unknown as MouseEvent<HTMLElement>)
    expect(preventDefault).toHaveBeenCalledTimes(1)
  })
})
