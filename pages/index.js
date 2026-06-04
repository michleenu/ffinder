import { useState } from 'react'
import Head from 'next/head'
import LeftArt from './LeftArt'
import RightArt from './RightArt'

const GENRES = ['any','drama','comedy','thriller','horror','romance','sci-fi','animation','documentary','action','fantasy','mystery','biography']
const LANGUAGES = ['any','english','french','japanese','korean','spanish','italian','mandarin','hindi','german','portuguese']
const COUNTRIES = ['any','USA','UK','France','Japan','South Korea','Italy','Spain','India','Germany','Brazil','Mexico']
const DECADES = ['any','2020s','2010s','2000s','1990s','1980s','pre-1980']
const CURRENT_YEAR = new Date().getFullYear()

function totalEstimate(r) {
  if (r >= 8.5) return '~350'
  if (r >= 8.0) return '~18,000'
  if (r >= 7.5) return '~45,000'
  if (r >= 7.0) return '~85,000'
  return '~130,000'
}

function formatDuration(mins) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export default function Home() {
  const [genre, setGenre] = useState('')
  const [rating, setRating] = useState(6.5)
  const [language, setLanguage] = useState('')
  const [country, setCountry] = useState('')
  const [decade, setDecade] = useState('')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [durationMin, setDurationMin] = useState(0)
  const [durationMax, setDurationMax] = useState(210)
  const [count, setCount] = useState(3)
  const [vibe, setVibe] = useState('')
  const [indieMode, setIndieMode] = useState(false)
  const [indieCountry, setIndieCountry] = useState('')
  const [films, setFilms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [seen, setSeen] = useState([])
  const [sortBy, setSortBy] = useState('rating')

  async function fetchFilms(isRegen = false) {
    setLoading(true)
    setError('')
    const exclude = isRegen ? seen : []
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre, rating: rating.toFixed(1), language, country,
          decade, yearFrom, yearTo, durationMin, durationMax,
          count, vibe, indieMode, indieCountry, exclude
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setFilms(data.films)
      setSeen(prev => [...prev, ...data.films.map(f => f.title)])
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const sorted = [...films].sort((a, b) => {
    if (sortBy === 'rating') return b.imdb_rating - a.imdb_rating
    if (sortBy === 'year_new') return b.year - a.year
    if (sortBy === 'year_old') return a.year - b.year
    return 0
  })

  return (
    <>
      <Head>
        <title>Film Finder</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="AI-powered film recommendations" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎬</text></svg>" />
        <style>{`
          @media (max-width: 600px) {
            .art-panel { display: none !important; }
            .app-main { padding: 1rem !important; }
            .app-layout { max-width: 100% !important; }
          }
        `}</style>
      </Head>

      <div style={s.page}>
        <header style={s.header}>
          <div style={s.headerInner}>
            <div style={s.logoRow}>
              <span style={s.logoDot}>◉</span>
              <span style={s.logoText}>film finder</span>
            </div>
            <p style={s.tagline}>your personal cinema curator</p>
          </div>
        </header>

        <div className="app-layout">
          <div className="art-panel"><LeftArt /></div>

          <main className="app-main">
            <div style={s.formCard}>
              <p style={s.formTitle}>what are you in the mood for?</p>

              {/* Indie toggle */}
              <div style={s.toggleRow} onClick={() => { setIndieMode(!indieMode); setFilms([]); setSeen([]) }}>
                <div style={{...s.toggleTrack, background: indieMode ? '#2D1040' : 'rgba(180,80,140,0.2)'}}>
                  <div style={{...s.toggleThumb, transform: indieMode ? 'translateX(20px)' : 'translateX(2px)'}} />
                </div>
                <div>
                  <span style={s.toggleLabel}>indie films — watch now</span>
                  <span style={s.toggleSub}>{indieMode ? 'showing free/streaming indie films with watch links' : 'toggle to find indie films available to watch instantly'}</span>
                </div>
              </div>

              {!indieMode && (
                <>
                  <div style={s.grid2}>
                    <Field label="genre"><Select value={genre} onChange={setGenre} options={GENRES} /></Field>
                    <Field label="language"><Select value={language} onChange={setLanguage} options={LANGUAGES} /></Field>
                  </div>
                  <div style={s.grid2}>
                    <Field label="country"><Select value={country} onChange={setCountry} options={COUNTRIES} /></Field>
                    <Field label={`how many: ${count}`}>
                      <input type="range" min="1" max="8" value={count} step="1"
                        onChange={e => setCount(Number(e.target.value))} style={s.range} />
                    </Field>
                  </div>

                  <Field label={`min imdb rating: ${rating.toFixed(1)}`}>
                    <input type="range" min="1" max="10" value={rating} step="0.1"
                      onChange={e => setRating(parseFloat(e.target.value))} style={s.range} />
                    <div style={s.sliderEnds}><span>1.0</span><span>10.0</span></div>
                  </Field>

                  <div style={s.grid2}>
                    <Field label="duration">
                      <select value={`${durationMin}-${durationMax}`} onChange={e => {
                        const [min, max] = e.target.value.split('-').map(Number)
                        setDurationMin(min); setDurationMax(max)
                      }} style={s.select}>
                        <option value="0-210">any length</option>
                        <option value="0-30">under 30 mins</option>
                        <option value="30-60">30 – 60 mins</option>
                        <option value="60-90">1h – 1h 30m</option>
                        <option value="90-120">1h 30m – 2h</option>
                        <option value="120-150">2h – 2h 30m</option>
                        <option value="150-210">2h 30m+</option>
                      </select>
                    </Field>
                    <Field label="decade">
                      <Select value={decade} onChange={setDecade} options={DECADES} />
                    </Field>
                  </div>

                  <Field label="or exact year range">
                    <div style={s.yearInputRow}>
                        <input type="number" min="1900" max={CURRENT_YEAR} value={yearFrom}
                          onChange={e => setYearFrom(e.target.value)} placeholder="from" style={s.yearInput} />
                        <span style={s.yearSep}>–</span>
                        <input type="number" min="1900" max={CURRENT_YEAR} value={yearTo}
                          onChange={e => setYearTo(e.target.value)} placeholder="to" style={s.yearInput} />
                      </div>
                    </Field>
                </>
              )}

              {indieMode && (
                <>
                  <div style={s.grid2}>
                    <Field label="genre"><Select value={genre} onChange={setGenre} options={GENRES} /></Field>
                    <Field label="country">
                      <Select value={indieCountry} onChange={setIndieCountry} options={['any','Japan','South Korea','China','Taiwan','Hong Kong','Thailand','Philippines','Indonesia','Vietnam','Malaysia','India','USA','UK','France','Italy','Spain','Germany','Brazil','Mexico','Iran']} />
                    </Field>
                  </div>
                  <Field label={`how many: ${count}`}>
                    <input type="range" min="1" max="8" value={count} step="1"
                      onChange={e => setCount(Number(e.target.value))} style={s.range} />
                  </Field>
                  <div style={s.ampNote}>
                    <span style={s.ampDot}>✦</span>
                    <span>asian picks draw from the spirit of <a href="https://asianmoviepulse.com" target="_blank" rel="noopener noreferrer" style={s.ampLink}>asian movie pulse</a> — arthouse, festival circuit & slow cinema</span>
                  </div>
                </>
              )}

              <Field label="describe the vibe">
                <textarea value={vibe} onChange={e => setVibe(e.target.value)}
                  placeholder={indieMode ? "e.g. heartfelt coming of age, quirky and low budget..." : "e.g. melancholy and visually stunning, like a dream you can't shake..."}
                  style={s.textarea} />
              </Field>

              <button onClick={() => fetchFilms(false)} disabled={loading} style={s.btnPrimary}>
                {loading ? '✦ finding films…' : indieMode ? '✦ find indie films to watch now' : '✦ find films'}
              </button>
              {error && <p style={s.error}>{error}</p>}
            </div>

            {/* Results */}
            {films.length > 0 && (
              <div style={s.results}>
                <div style={s.resultsBar}>
                  <div>
                    <span style={s.resultsCount}>{films.length} films for you</span>
                    {!indieMode && <span style={s.totalCount}> (total {totalEstimate(rating)} rated {rating.toFixed(1)}+)</span>}
                    {indieMode && <span style={s.indieBadge}>indie · watch now</span>}
                  </div>
                  <div style={s.sortRow}>
                    <span style={s.sortLabel}>sort:</span>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={s.sortSelect}>
                      <option value="rating">rating</option>
                      <option value="year_new">newest</option>
                      <option value="year_old">oldest</option>
                    </select>
                  </div>
                </div>

                {sorted.map((film, i) => <FilmCard key={film.title + i} film={film} indieMode={indieMode} />)}

                <button onClick={() => fetchFilms(true)} disabled={loading} style={s.btnRegen}>
                  {loading ? 'finding more…' : '↻ different films, same vibe'}
                </button>
              </div>
            )}
          </main>

          <div className="art-panel"><RightArt /></div>
        </div>

        <footer style={s.footer}>
          <p>powered by groq · made with ✦</p>
        </footer>
      </div>
    </>
  )
}

function FilmCard({ film, indieMode }) {
  const [imgError, setImgError] = useState(false)
  const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(film.trailer_query || `${film.title} ${film.year} official trailer`)}`

  return (
    <div style={s.card}>
      <div style={s.posterWrap}>
        {film.poster_url && !imgError ? (
          <img src={film.poster_url} alt={`${film.title} poster`}
            style={s.poster} onError={() => setImgError(true)} />
        ) : (
          <div style={s.posterFallback}>
            <span style={s.posterInitial}>{film.title[0]}</span>
          </div>
        )}
        <div style={s.ratingBadge}>★ {film.imdb_rating}</div>
      </div>
      <div style={s.cardBody}>
        <p style={s.cardTitle}>{film.title}</p>
        <p style={s.cardMeta}>{film.year} · {film.country} · {film.language}</p>
        <p style={s.cardGenre}>{film.genre}{film.duration_mins ? ` · ${Math.floor(film.duration_mins/60)}h ${film.duration_mins%60}m` : ''}</p>
        <p style={s.cardDesc}>{film.description}</p>
        <div style={s.linkRow}>
          {indieMode && film.watch_url ? (
            <>
              <a href={film.watch_url} target="_blank" rel="noopener noreferrer" style={s.watchLink}>
                ▶ watch now
              </a>
              <a href={trailerUrl} target="_blank" rel="noopener noreferrer" style={s.trailerLink}>
                trailer
              </a>
            </>
          ) : (
            <a href={trailerUrl} target="_blank" rel="noopener noreferrer" style={s.trailerLink}>
              ▶ watch trailer
            </a>
          )}
          {indieMode && film.watch_platform && (
            <span style={s.platformBadge}>{film.watch_platform}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={s.select}>
      {options.map(o => <option key={o} value={o === 'any' ? '' : o}>{o}</option>)}
    </select>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FDF0F5' },
  header: { background: '#2D1040', padding: '1rem 1.5rem' },
  headerInner: { maxWidth: 960, margin: '0 auto' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 },
  logoDot: { fontSize: 16, color: '#E8A0C0', fontFamily: 'DM Serif Display, serif' },
  logoText: { fontSize: 18, fontFamily: 'DM Serif Display, serif', color: '#F5E6F0', letterSpacing: '0.02em' },
  tagline: { fontSize: 11, color: 'rgba(245,230,240,0.38)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 300 },

  formCard: { background: '#FAEAF2', border: '1px solid rgba(180,80,140,0.18)', borderRadius: 16, padding: '1.5rem', marginBottom: 0 },
  formTitle: { fontFamily: 'DM Serif Display, serif', fontSize: 19, color: '#2D1040', marginBottom: '1rem' },

  toggleRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', cursor: 'pointer', background: '#FDF0F5', border: '1px solid rgba(180,80,140,0.2)', borderRadius: 10, padding: '10px 12px' },
  toggleTrack: { width: 42, height: 24, borderRadius: 12, position: 'relative', flexShrink: 0, transition: 'background 0.2s', cursor: 'pointer' },
  toggleThumb: { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  toggleLabel: { fontSize: 13, fontWeight: 500, color: '#2D1040', display: 'block' },
  toggleSub: { fontSize: 11, color: '#9A5070', display: 'block', marginTop: 1 },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  field: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 },
  fieldLabel: { fontSize: 10, fontWeight: 500, color: '#9A5070', textTransform: 'uppercase', letterSpacing: '0.07em' },
  select: {
    width: '100%', padding: '7px 26px 7px 10px', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
    background: '#FDF0F5', color: '#2D1040', border: '1px solid rgba(180,80,140,0.32)',
    borderRadius: 8, outline: 'none', cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239A5070' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
  },
  range: { width: '100%', marginTop: 4, accentColor: '#C4527A' },
  dualSlider: { display: 'flex', flexDirection: 'column', gap: 4 },
  sliderEnds: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9A5070', marginTop: 2 },
  yearInputRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 },
  yearInput: {
    flex: 1, minWidth: 0, padding: '6px 8px', fontSize: 12, fontFamily: 'DM Sans, sans-serif',
    background: '#FDF0F5', color: '#2D1040', border: '1px solid rgba(180,80,140,0.32)',
    borderRadius: 7, outline: 'none', textAlign: 'center',
  },
  yearSep: { fontSize: 13, color: '#9A5070', flexShrink: 0 },
  textarea: {
    width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
    background: '#FDF0F5', color: '#2D1040', border: '1px solid rgba(180,80,140,0.32)',
    borderRadius: 8, outline: 'none', resize: 'none', height: 72, lineHeight: 1.55,
    overflowY: 'auto',
  },
  btnPrimary: {
    width: '100%', padding: '11px', marginTop: 6, fontSize: 15,
    fontFamily: 'DM Serif Display, serif', letterSpacing: '0.03em',
    background: '#2D1040', color: '#F5E6F0', border: 'none', borderRadius: 10, cursor: 'pointer',
  },
  error: { marginTop: 10, fontSize: 12, color: '#C0392B', textAlign: 'center' },

  results: { marginTop: '1.25rem' },
  resultsBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 },
  resultsCount: { fontSize: 12, fontWeight: 500, color: '#2D1040' },
  totalCount: { fontSize: 11, color: '#9A5070' },
  indieBadge: { fontSize: 11, color: '#fff', background: '#7A3AAA', borderRadius: 10, padding: '1px 8px', marginLeft: 6 },
  sortRow: { display: 'flex', alignItems: 'center', gap: 6 },
  sortLabel: { fontSize: 11, color: '#9A5070', textTransform: 'uppercase', letterSpacing: '0.06em' },
  sortSelect: {
    fontSize: 12, fontFamily: 'DM Sans, sans-serif',
    background: '#FAEAF2', color: '#2D1040', border: '1px solid rgba(180,80,140,0.32)',
    borderRadius: 16, outline: 'none', cursor: 'pointer', padding: '3px 22px 3px 10px', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='%239A5070' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center',
  },
  card: {
    display: 'flex', flexDirection: 'row',
    background: '#FAEAF2', border: '1px solid rgba(180,80,140,0.18)',
    borderRadius: 14, overflow: 'hidden', marginBottom: 10,
  },
  posterWrap: { position: 'relative', width: 82, minWidth: 82, background: '#2D1040', flexShrink: 0 },
  poster: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  posterFallback: { width: '100%', height: '100%', minHeight: 110, background: '#3D1858', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  posterInitial: { fontFamily: 'DM Serif Display, serif', fontSize: 36, color: 'rgba(245,200,230,0.3)', fontStyle: 'italic' },
  ratingBadge: { position: 'absolute', bottom: 6, left: 6, background: '#C4527A', color: '#fff', fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10 },
  cardBody: { padding: '10px 13px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  cardTitle: { fontFamily: 'DM Serif Display, serif', fontSize: 15, color: '#2D1040', marginBottom: 2, lineHeight: 1.3 },
  cardMeta: { fontSize: 11, color: '#9A5070', marginBottom: 1 },
  cardGenre: { fontSize: 11, color: '#B870A0', marginBottom: 6, fontStyle: 'italic' },
  cardDesc: { fontSize: 12, color: '#5C3050', lineHeight: 1.6, marginBottom: 8, flex: 1 },
  linkRow: { display: 'flex', alignItems: 'center', gap: 8 },
  trailerLink: { fontSize: 11, fontWeight: 500, color: '#7A3AAA', textDecoration: 'none' },
  watchLink: { fontSize: 11, fontWeight: 500, color: '#fff', background: '#7A3AAA', borderRadius: 8, padding: '3px 10px', textDecoration: 'none' },
  platformBadge: { fontSize: 10, color: '#9A5070', background: '#FDF0F5', border: '1px solid rgba(180,80,140,0.2)', borderRadius: 8, padding: '2px 8px' },
  ampNote: { display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: '#9A5070', background: '#FDF0F5', border: '1px solid rgba(180,80,140,0.15)', borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.5 },
  ampDot: { color: '#C4527A', flexShrink: 0, marginTop: 1 },
  ampLink: { color: '#7A3AAA', textDecoration: 'none', fontWeight: 500 },

  btnRegen: {
    width: '100%', padding: '10px', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
    fontWeight: 500, background: 'transparent', color: '#2D1040',
    border: '1px solid rgba(180,80,140,0.32)', borderRadius: 10, cursor: 'pointer', marginTop: 4,
  },
  footer: { textAlign: 'center', padding: '1.25rem', fontSize: 11, color: '#9A5070', borderTop: '1px solid rgba(180,80,140,0.15)' },
}
