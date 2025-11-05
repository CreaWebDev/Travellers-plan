// composables/useScrollColor.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useScrollColor(threshold = 300, colorA = '#F7F5F9', colorB = '#1E1E2D') {
  const bgColor = ref(colorA)

  function onScroll() {
    bgColor.value = window.scrollY > threshold ? colorB : colorA
  }

  onMounted(() => {
    window.addEventListener('scroll', onScroll)
    onScroll() // sæt initial værdi
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
  })

  return { bgColor }
}
