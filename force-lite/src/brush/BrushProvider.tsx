import { ReactNode, useEffect } from 'react'
import './theme.css'

export function BrushProvider({ children }: { children: ReactNode }){
  useEffect(() => {
    document.documentElement.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--bg')
  }, [])
  return children as any
}

