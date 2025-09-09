import { Suspense, lazy } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, Route, Routes } from 'react-router-dom'
import AuthStatus from './components/AuthStatus'

const HomePage = lazy(() => import('./routes/Home'))
const ArtistPage = lazy(() => import('./routes/Artist'))
const ArtistsPage = lazy(() => import('./routes/Artists'))
const ArtworkPage = lazy(() => import('./routes/Artwork'))
const SearchPage = lazy(() => import('./routes/Search'))
const SellPage = lazy(() => import('./routes/Sell'))
const DashboardPage = lazy(() => import('./routes/Dashboard'))
const AuthPage = lazy(() => import('./routes/Auth'))
import ProtectedRoute from './components/ProtectedRoute'
const MyArtworksPage = lazy(() => import('./routes/MyArtworks'))

export default function App() {
  return (
    <>
      <Helmet>
        <title>Force Lite</title>
        <meta name="description" content="A performant, SSR React marketplace inspired by Artsy." />
        <link rel="canonical" href="/" />
      </Helmet>
      <header style={{ padding: 16, borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <nav style={{ display: 'flex', gap: 16 }}>
          <Link to="/">Home</Link>
          <Link to="/search">Search</Link>
          <Link to="/artists">Artists</Link>
          <Link to="/sell">Sell</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
        <AuthStatus />
      </header>
      <main>
        <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/artist/:slug" element={<ArtistPage />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/artwork/:id" element={<ArtworkPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/sell" element={<SellPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/my-artworks" element={<ProtectedRoute><MyArtworksPage /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </main>
    </>
  )
}
