import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props){
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(){
    return { hasError: true }
  }
  componentDidCatch(err: any){
    // Rely on Sentry if present
    // eslint-disable-next-line no-console
    console.error(err)
  }
  render(){
    if (this.state.hasError) return <div style={{ padding: 24 }}>Something went wrong. Please refresh.</div>
    return this.props.children
  }
}

