// useAtTop.ts
import { ref, onMounted, onUnmounted, type Ref } from 'vue'

type Opts = { offset?: number; rootSelector?: string }

export function useAtTop(elRef: Ref<HTMLElement | null>, opts: Opts = {}) {
  const { offset = 0, rootSelector = '' } = opts
  const isAtTop = ref(false)

  let ticking = false
  const rootEl: HTMLElement | Window | null =
    rootSelector ? (document.querySelector(rootSelector) as HTMLElement | null) : window

  function measure() {
    const el = elRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const topLine = offset // fx sticky header højde
    // true når section-top er nået og sektionen stadig “inde”
    isAtTop.value = rect.top <= topLine && rect.bottom > topLine
  }

  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      measure()
      ticking = false
    })
  }

  onMounted(() => {
    measure()
    ;(rootEl || window).addEventListener('scroll', onScroll as any, { passive: true })
    window.addEventListener('resize', onScroll)
  })

  onUnmounted(() => {
    ;(rootEl || window).removeEventListener('scroll', onScroll as any)
    window.removeEventListener('resize', onScroll)
  })

  return { isAtTop, refresh: measure }
}
