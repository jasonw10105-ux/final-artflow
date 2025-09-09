import { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'primary' }

export default function Button({ variant='default', className='', ...rest }: Props){
  const cls = `brush-button ${variant==='primary'?'primary':''} ${className}`.trim()
  return <button className={cls} {...rest} />
}

