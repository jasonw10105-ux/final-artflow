import { useState } from 'react'

type Props = { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }

export default function Toggle({ checked, onChange, disabled }: Props){
  const [focus, setFocus] = useState(false)
  return (
    <button
      type="button"
      className={`toggle ${checked ? 'on' : 'off'} ${focus ? 'focus' : ''}`}
      aria-pressed={checked}
      onClick={() => !disabled && onChange(!checked)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      disabled={disabled}
      style={{
        width: 40, height: 24, borderRadius: 999,
        border: '1px solid var(--border)', background: checked ? 'var(--primary)' : 'var(--card)',
        position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2, width: 20, height: 20,
          borderRadius: 999, background: 'var(--fg)', transition: 'left 120ms ease'
        }}
      />
    </button>
  )
}

