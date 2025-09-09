import { useEffect, useRef } from 'react'

export function useEffectOnce(effect: () => void | (() => void)) {
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    return effect()
  }, [])
}

