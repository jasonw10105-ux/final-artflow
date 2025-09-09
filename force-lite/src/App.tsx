import { Suspense, lazy } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, Route, Routes } from 'react-router-dom'

const HomePage = lazy(() => import('./routes/Home'))
const ArtistPage = lazy(() => import('./routes/Artist'))
const ArtworkPage = lazy(() => import('./routes/Artwork'))
const SearchPage = lazy(() => import('./routes/Search'))
const SellPage = lazy(() => import('./routes/Sell'))

export default function App() {
  return (
    <>
      <Helmet>
        <title>Force Lite</title>
        <meta name="description" content="A performant, SSR React marketplace inspired by Artsy." />
        <link rel="canonical" href="/" />
      </Helmet>
      <header style={{ padding: 16, borderBottom: '1px solid #222' }}>
        <nav style={{ display: 'flex', gap: 16 }}>
          <Link to="/">Home</Link>
          <Link to="/search">Search</Link>
          <Link to="/sell">Sell</Link>
        </nav>
      </header>
      <main>
        <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/artist/:slug" element={<ArtistPage />} />
            <Route path="/artwork/:id" element={<ArtworkPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/sell" element={<SellPage />} />
          </Routes>
        </Suspense>
      </main>
    </>
  )
}
