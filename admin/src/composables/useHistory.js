import { ref, computed } from 'vue'

export function useHistory(maxSize = 50) {
  const stack = ref([])
  const future = ref([])
  const canUndo = computed(() => stack.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  function pushSnapshot(state) {
    stack.value.push(JSON.stringify(state))
    if (stack.value.length > maxSize) stack.value.shift()
    future.value = []
  }

  function undo(currentState) {
    if (!canUndo.value) return null
    future.value.push(JSON.stringify(currentState))
    return JSON.parse(stack.value.pop())
  }

  function redo(currentState) {
    if (!canRedo.value) return null
    stack.value.push(JSON.stringify(currentState))
    return JSON.parse(future.value.pop())
  }

  function clear() {
    stack.value = []
    future.value = []
  }

  return { pushSnapshot, undo, redo, canUndo, canRedo, clear }
}
