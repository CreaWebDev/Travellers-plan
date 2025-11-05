import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export function useScrollSectionClass(targetRef: Ref<HTMLElement | null>, className: string, defaultClass = '') {
  const activeClass = ref(defaultClass)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!targetRef.value) return

    observer = new IntersectionObserver(
      ([entry]) => {
        activeClass.value = entry.isIntersecting ? className : defaultClass
      },
      { threshold: 0.5 }
    )

    observer.observe(targetRef.value)
  })

  onUnmounted(() => {
    if (observer && targetRef.value) {
      observer.unobserve(targetRef.value)
    }
  })

  return activeClass
}
