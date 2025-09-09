import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'

export function render(url: string) {
  const helmetContext: { helmet?: any } = {}
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HelmetProvider>
  )
  const helmet = helmetContext.helmet
  const head = [helmet?.title?.toString() ?? '', helmet?.meta?.toString() ?? '', helmet?.link?.toString() ?? ''].join('\n')
  return { html, head }
}

