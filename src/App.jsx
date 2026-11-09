import { useEffect, useMemo, useState } from 'react'
import './App.css'

const DEFAULT_API_BASE = 'http://localhost:8080/api/v1'
const API_BASE = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE).replace(/\/+$/, '')

const EMPTY_FORM = {
  name: '',
  nationalId: '',
  phone: '',
  relationshipToInmate: '',
  inmate: '',
  purpose: '',
  checkedItems: [],
  date: '',
  time: '09:00',
}

function readJson(response) {
  if (response.status === 204) return null

  return response.text().then((text) => {
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  })
}

function getStoredToken() {
  return localStorage.getItem('pms-access-token') || ''
}

function formatTime(value) {
  if (!value) return '—'

  const raw = String(value)
  if (raw.includes('T')) {
    const timePart = raw.split('T')[1]?.slice(0, 5)
    if (timePart) {
      const [hours, minutes] = timePart.split(':')
      const hourNumber = Number(hours)
      const suffix = hourNumber >= 12 ? 'PM' : 'AM'
      return `${hourNumber % 12 || 12}:${minutes} ${suffix}`
    }
  }

  if (raw.length <= 5) {
    const [hours, minutes] = raw.split(':')
    const hourNumber = Number(hours)
    const suffix = hourNumber >= 12 ? 'PM' : 'AM'
    return `${hourNumber % 12 || 12}:${minutes} ${suffix}`
  }

  return raw
}

function buildVisitPayload(form, inmate) {
  if (!inmate?.id) {
    throw new Error('Select a valid inmate before registering the visit.')
  }

  const [hours, minutes] = (form.time || '09:00').split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + 60
  const endHour = Math.floor(totalMinutes / 60) % 24
  const endMinute = totalMinutes % 60

  return {
    visitorFullName: form.name.trim(),
    inmateId: inmate.id,
    visitDate: form.date,
    startTime: form.time,
    endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
    itemsBrought: form.checkedItems.length ? form.checkedItems.join(', ') : form.purpose.trim(),
  }
}

function normalizeVisit(record) {
  return {
    id: record.id || record.visitId || record._id,
    name: record.visitorFullName || record.visitorName || 'Unknown visitor',
    inmate: record.inmateName || record.inmate?.fullName || 'Unknown inmate',
    status: record.status || 'Logged',
    date: record.visitDate || record.date || '',
    time: record.startTime || record.time || '',
    endTime: record.endTime || '',
    itemsBrought: record.itemsBrought || '',
    loggedBy: record.loggedBy || record.loggingUserName || '',
    inmateId: record.inmateId || record.inmate?.id || '',
    source: record,
  }
}

function App() {
  const [visits, setVisits] = useState([])
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [inmateSearch, setInmateSearch] = useState('')
  const [inmateResults, setInmateResults] = useState([])
  const [selectedInmate, setSelectedInmate] = useState(null)
  const [lookingUpInmates, setLookingUpInmates] = useState(false)
  const [tokenInput, setTokenInput] = useState(getStoredToken())
  const [authToken, setAuthToken] = useState(getStoredToken())

  const today = new Date().toLocaleDateString('en-CA')
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    date: today,
  })

  const visitCount = visits.length
  const todayLogCount = visits.filter((visit) => visit.date === today).length
  const activeVisitorCount = visits.filter((visit) => visit.date === today).length
  const pendingCount = visits.filter((visit) => visit.status === 'Pending').length

  const gateCandidates = useMemo(
    () => visits.filter((visit) => visit.date === today),
    [visits, today],
  )

  async function fetchJson(url, options = {}) {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    }

    const response = await fetch(url, {
      ...options,
      headers: requestHeaders,
    })

    if (!response.ok) {
      const payload = await readJson(response)
      const message = typeof payload === 'string' ? payload : payload?.message || 'The server rejected the request.'
      throw new Error(message)
    }

    return readJson(response)
  }

  async function loadVisits() {
    setLoading(true)

    try {
      const response = await fetchJson(`${API_BASE}/visits?page=0&size=20`)
      const rows = Array.isArray(response)
        ? response
        : Array.isArray(response?.content)
          ? response.content
          : []

      setVisits(rows.map(normalizeVisit))
      setNotice('')
    } catch (error) {
      console.error('Loading visits failed:', error)
      setNotice(`Cannot load the live PMS backend. Check the API at ${API_BASE} and provide a valid bearer token.`)
      setVisits([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadVisits()
  }, [authToken])

  useEffect(() => {
    const query = inmateSearch.trim()
    if (query.length < 2 || selectedInmate) return

    let cancelled = false

    async function searchInmates() {
      setLookingUpInmates(true)
      try {
        const response = await fetchJson(`${API_BASE}/inmates?search=${encodeURIComponent(query)}&page=0&size=10`)
        const rows = Array.isArray(response)
          ? response
          : Array.isArray(response?.content)
            ? response.content
            : []

        if (!cancelled) setInmateResults(rows)
      } catch (error) {
        if (!cancelled) {
          console.error('Search inmates failed:', error)
          setInmateResults([])
        }
      } finally {
        if (!cancelled) setLookingUpInmates(false)
      }
    }

    const timer = setTimeout(searchInmates, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [inmateSearch, selectedInmate, authToken])

  function resetRegistrationForm() {
    setForm({ ...EMPTY_FORM, date: today })
    setInmateSearch('')
    setInmateResults([])
    setSelectedInmate(null)
  }

  async function registerVisitor(event) {
    event.preventDefault()

    if (!selectedInmate) {
      setNotice('Search for and select an inmate before registering the visit.')
      return
    }

    const payload = buildVisitPayload(form, selectedInmate)

    if (!payload.visitorFullName || !payload.visitDate || !payload.startTime || !payload.endTime) {
      setNotice('Please complete all required visit details.')
      return
    }

    setFormBusy(true)
    setNotice('')

    try {
      const created = await fetchJson(`${API_BASE}/visits`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const item = normalizeVisit(created)
      setVisits((current) => [item, ...current])
      resetRegistrationForm()
      setNotice('Visitor visit recorded successfully in the live backend.')
    } catch (error) {
      console.error('Register visitor failed:', error)
      setNotice(error.message || 'Could not register the visit.')
    } finally {
      setFormBusy(false)
    }
  }

  function handleUseToken() {
    const trimmed = tokenInput.trim()
    if (!trimmed) {
      localStorage.removeItem('pms-access-token')
      setAuthToken('')
      setNotice('Token cleared. Add a valid bearer token to query the live backend.')
      return
    }

    localStorage.setItem('pms-access-token', trimmed)
    setAuthToken(trimmed)
    setNotice('Bearer token saved and the live API is active.')
  }

  return (
    <div className="app-shell reference-shell">
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">
            <strong>Prison Management System</strong>
            <span className="breadcrumb-divider">/</span>
            <span>Visitor Management</span>
          </div>

          <div className="reference-topbar-right">
            <span className="secure-pill">● System Secure</span>
            <span>◉ API: {API_BASE}</span>
            <input
              aria-label="Bearer token"
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Bearer token"
              style={{ width: '180px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #c8d1dc' }}
            />
            <button type="button" className="primary-button" onClick={handleUseToken}>Use token</button>
          </div>
        </header>

        <div className="page-content" id="visitor-dashboard">
          <section className="page-heading">
            <div>
              <p className="eyebrow">FACILITY OPERATIONS / RECORDS</p>
              <h1>Visitor Management</h1>
              <p className="page-description">
                Register and review visits using the live PMS API contract.
              </p>
            </div>
          </section>

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>×</button>
            </div>
          )}

          <section className="stats-grid" aria-label="Visitor statistics">
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Active visitors on site</span>
                <span className="stat-icon stat-blue">♙</span>
              </div>
              <div className="stat-number">{activeVisitorCount}</div>
              <p className="stat-footnote">Live visit records for today</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Pending review</span>
                <span className="stat-icon stat-amber">◷</span>
              </div>
              <div className="stat-number">{pendingCount}</div>
              <p className="stat-footnote">Status is tracked by the backend</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Gatehouse status</span>
                <span className="stat-icon stat-green">♙</span>
              </div>
              <div className="stat-number secure-word">SECURE</div>
              <p className="stat-footnote">Live PMS API connected</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Today's total logs</span>
                <span className="stat-icon stat-purple">◴</span>
              </div>
              <div className="stat-number">{todayLogCount}</div>
              <p className="stat-footnote">Visit records recorded today</p>
            </article>
          </section>

          <div className="reference-dashboard-grid">
            <div className="reference-left-stack">
              <section className="reference-panel reference-registration">
                <div className="reference-panel-heading">
                  <h2><span>♧</span> Visitor Registration Form</h2>
                  <small>Live PMS API</small>
                </div>

                <form className="reference-inline-form" onSubmit={registerVisitor}>
                  <div className="reference-fields-grid">
                    <label>
                      Full Name
                      <input
                        required
                        maxLength="100"
                        placeholder="e.g. Jonathan R. Vance"
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                      />
                    </label>

                    <label>
                      National ID / Passport
                      <input
                        maxLength="60"
                        placeholder="US-99482103-X"
                        value={form.nationalId}
                        onChange={(event) => setForm({ ...form, nationalId: event.target.value })}
                      />
                    </label>

                    <label>
                      Contact Details
                      <input
                        type="tel"
                        maxLength="30"
                        placeholder="+1 (555) 019-2834"
                        value={form.phone}
                        onChange={(event) => setForm({ ...form, phone: event.target.value })}
                      />
                    </label>

                    <label>
                      Relationship to Inmate
                      <select
                        value={form.relationshipToInmate}
                        onChange={(event) => setForm({ ...form, relationshipToInmate: event.target.value })}
                      >
                        <option value="">Select relationship</option>
                        <option>Legal Counsel / Attorney</option>
                        <option>Spouse</option>
                        <option>Parent</option>
                        <option>Child</option>
                        <option>Sibling</option>
                        <option>Relative</option>
                        <option>Friend</option>
                        <option>Other</option>
                      </select>
                    </label>
                  </div>

                  <label className="reference-wide-field">
                    Inmate Lookup
                    <input
                      placeholder="Search inmate name or ID..."
                      value={inmateSearch}
                      onChange={(event) => {
                        setInmateSearch(event.target.value)
                        setSelectedInmate(null)
                        setForm({ ...form, inmate: '' })
                      }}
                    />
                  </label>

                  {lookingUpInmates && <p className="reference-help">Searching inmate records...</p>}

                  {inmateResults.length > 0 && !selectedInmate && (
                    <div className="reference-inmate-results">
                      {inmateResults.map((inmate) => (
                        <button
                          type="button"
                          key={inmate.id || inmate.fullName}
                          onClick={() => {
                            setSelectedInmate(inmate)
                            setForm({ ...form, inmate: inmate.fullName })
                            setInmateSearch(inmate.fullName)
                            setInmateResults([])
                          }}
                        >
                          <strong>{inmate.fullName}</strong>
                          <span>{inmate.cellBlock || 'Cell block not provided'} · {inmate.visitationAllowed ? 'Visitation allowed' : 'Restricted'}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedInmate && (
                    <div className="reference-selected-inmate">
                      <strong>{selectedInmate.fullName}</strong>
                      <span>{selectedInmate.cellBlock || 'Cell block not provided'} · {selectedInmate.visitationAllowed ? 'Visitation allowed' : 'Restricted'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInmate(null)
                          setInmateSearch('')
                          setForm({ ...form, inmate: '' })
                        }}
                      >
                        Change
                      </button>
                    </div>
                  )}

                  <label className="reference-wide-field">
                    Purpose of Visit
                    <input
                      maxLength="500"
                      placeholder="Brief reason for visit"
                      value={form.purpose}
                      onChange={(event) => setForm({ ...form, purpose: event.target.value })}
                    />
                  </label>

                  <fieldset className="reference-gate-checks">
                    <legend>Checked Items at Gate (Security Screening)</legend>
                    {['Valid ID', 'Metal Detector Clear', 'No Electronics', 'Bag Tagged'].map((item) => (
                      <label key={item}>
                        <input
                          type="checkbox"
                          checked={form.checkedItems.includes(item)}
                          onChange={(event) => {
                            const checkedItems = event.target.checked
                              ? [...form.checkedItems, item]
                              : form.checkedItems.filter((checked) => checked !== item)

                            setForm({ ...form, checkedItems })
                          }}
                        />
                        {item}
                      </label>
                    ))}
                  </fieldset>

                  <div className="reference-form-footer">
                    <label>
                      Visit date
                      <input
                        required
                        type="date"
                        min={today}
                        value={form.date}
                        onChange={(event) => setForm({ ...form, date: event.target.value })}
                      />
                    </label>

                    <label>
                      Visit time
                      <input
                        required
                        type="time"
                        value={form.time}
                        onChange={(event) => setForm({ ...form, time: event.target.value })}
                      />
                    </label>

                    <div>
                      <button className="outline-button" type="button" onClick={resetRegistrationForm}>Clear Form</button>
                      <button className="dark-button" type="submit" disabled={formBusy}>
                        {formBusy ? 'Registering...' : 'Register & Issue Pass'}
                      </button>
                    </div>
                  </div>
                </form>
              </section>

              <section className="reference-panel reference-lookup">
                <div className="reference-panel-heading">
                  <h2><span>⌕</span> Inmate Lookup</h2>
                  <small>Minimum access data from live API</small>
                </div>

                <label className="reference-lookup-search">
                  <input
                    aria-label="Search inmate"
                    placeholder="Search inmate name..."
                    value={inmateSearch}
                    onChange={(event) => setInmateSearch(event.target.value)}
                  />
                  <button type="button" onClick={() => setSelectedInmate(null)}>Lookup</button>
                </label>

                {selectedInmate ? (
                  <div className="reference-inmate-card">
                    <div className="reference-photo-placeholder">
                      {selectedInmate.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                      <h3>{selectedInmate.fullName}</h3>
                      <p>Cell Block: <strong>{selectedInmate.cellBlock || 'Not available'}</strong></p>
                      <small>✓ Verified minimum information displayed</small>
                    </div>
                    <button type="button" onClick={() => setForm({ ...form, inmate: selectedInmate.fullName })}>Attach to Visit</button>
                  </div>
                ) : (
                  <p className="reference-lookup-empty">Search for an inmate to attach to the visit record.</p>
                )}
              </section>
            </div>

            <div className="reference-right-stack">
              <section className="reference-panel reference-gatehouse">
                <div className="reference-panel-heading">
                  <h2><span>♧</span> Gatehouse Touch Controls</h2>
                  <span className="live-port">LIVE PORT</span>
                </div>

                <label className="gate-visitor-select">
                  Approved visitor
                  <select aria-label="Select an approved visitor" value="">
                    <option value="">Select visitor...</option>
                    {gateCandidates.map((visitor) => (
                      <option key={visitor.id} value={visitor.id}>{visitor.name}</option>
                    ))}
                  </select>
                </label>

                <div className="reference-gate-buttons">
                  <button className="gate-check-in" type="button" disabled>
                    <span>⇥</span>CHECK-IN
                  </button>
                  <button className="gate-check-out" type="button" disabled>
                    <span>⇤</span>CHECK-OUT
                  </button>
                </div>

                <p className="reference-gate-empty">
                  The live PMS backend records visits through /api/v1/visits; entry and exit timestamps are managed separately by the API contract.
                </p>

                <div className="reference-port-details">
                  <p><span>Active Station Terminal</span><strong>GT-PORT-04</strong></p>
                  <p><span>Gatekeeper Officer ID</span><strong>SEC-OFF-882</strong></p>
                  <p><span>System Synchronization</span><strong className="optimal-label">Connected</strong></p>
                </div>
              </section>

              <section className="reference-panel reference-session-logs">
                <div className="reference-panel-heading">
                  <h2><span>▤</span> Active Session Logs</h2>
                  <button className="clear-filters" type="button" onClick={() => setShowAllSessions((value) => !value)}>
                    {showAllSessions ? 'Show recent' : `View all (${visitCount})`}
                  </button>
                </div>

                <div className="reference-log-header">
                  <span>VISITOR / INMATE</span>
                  <span>ENTRY</span>
                  <span>STATUS</span>
                </div>

                {loading ? (
                  <p className="reference-log-empty">Loading sessions...</p>
                ) : (showAllSessions ? visits : visits.slice(0, 6)).map((visit) => (
                  <div className="reference-log-row" key={visit.id || `${visit.name}-${visit.date}`}>
                    <div>
                      <strong>{visit.name}</strong>
                      <span>↳ {visit.inmate}</span>
                    </div>
                    <time>{visit.time ? formatTime(visit.time) : '—'}</time>
                    <div className="reference-log-actions">
                      <span className="reference-log-status scheduled">{visit.status}</span>
                    </div>
                  </div>
                ))}

                {!loading && visits.length === 0 && <p className="reference-log-empty">No visitor sessions have been recorded yet.</p>}
              </section>
            </div>
          </div>

          <footer className="page-footer">
            <span>Prison Management System</span>
            <span>Visitor Management · Real API integration</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
