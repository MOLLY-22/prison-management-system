
import { useEffect, useState } from 'react'
import './App.css'

const API_URL =
  import.meta.env.VITE_API_URL || '/api/visitors'

const INMATES_URL = API_URL.replace(/\/visitors\/?$/, '/inmates')

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

function formatTime(time) {
  if (!time) return '—'

  const [hours, minutes] = time.split(':')
  const hour = Number(hours)

  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`
}

function App() {
  const [visitors, setVisitors] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [formBusy, setFormBusy] = useState(false)
  const [gateVisitorId, setGateVisitorId] = useState('')

  const [inmateSearch, setInmateSearch] = useState('')
  const [inmateResults, setInmateResults] = useState([])
  const [selectedInmate, setSelectedInmate] = useState(null)
  const [lookingUpInmates, setLookingUpInmates] = useState(false)

  const today = new Date().toLocaleDateString('en-CA')

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    date: today,
  })

  async function loadVisitors() {
    try {
      const response = await fetch(API_URL)

      if (!response.ok) {
        throw new Error('The server could not load visitor records.')
      }

      setVisitors(await response.json())
    } catch (error) {
      console.error('Loading visitors failed:', error)
      setNotice(
        'Cannot connect to the backend. Start the mock backend on port 5000.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVisitors()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const query = inmateSearch.trim()

    if (query.length < 2 || selectedInmate) {
      return
    }

    let cancelled = false

    async function findInmates() {
      setLookingUpInmates(true)

      try {
        const response = await fetch(
          `${INMATES_URL}?search=${encodeURIComponent(query)}`,
        )

        if (!response.ok) {
          throw new Error('Could not search inmate records.')
        }

        const results = await response.json()

        if (!cancelled) setInmateResults(results)
      } catch (error) {
        if (!cancelled) {
          console.error('Inmate lookup failed:', error)
          setInmateResults([])
        }
      } finally {
        if (!cancelled) setLookingUpInmates(false)
      }
    }

    const timer = setTimeout(findInmates, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [inmateSearch, selectedInmate])

  const pendingCount = visitors.filter(
    (visitor) => visitor.status === 'Pending',
  ).length

  const gateCandidates = visitors.filter(
    (visitor) => visitor.status === 'Approved' && !visitor.exitTimestamp,
  )
  const gateVisitor =
    gateCandidates.find((visitor) => String(visitor.id) === gateVisitorId) ||
    gateCandidates[0]
  const activeVisitorCount = visitors.filter(
    (visitor) => visitor.entryTimestamp && !visitor.exitTimestamp,
  ).length
  const todayLogCount = visitors.filter(
    (visitor) => visitor.date === today,
  ).length

  async function recordVisitTime(visitor, action) {
    if (busyId !== null) return

    setBusyId(visitor.id)
    setNotice('')

    try {
      const response = await fetch(
        `${API_URL}/${visitor.id}/${action}`,
        { method: 'POST' },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Could not record visit time.')
      }

      setVisitors((current) =>
        current.map((item) =>
          item.id === visitor.id ? { ...item, ...result } : item,
        ),
      )

      setNotice(
        action === 'entry'
          ? `Entry time recorded for ${visitor.name}.`
          : `Exit time recorded for ${visitor.name}.`,
      )
    } catch (error) {
      console.error('Recording visit time failed:', error)
      setNotice(error.message || 'Could not record visit time.')
    } finally {
      setBusyId(null)
    }
  }

  function resetRegistrationForm() {
    setForm({ ...EMPTY_FORM, date: today })
    setInmateSearch('')
    setInmateResults([])
    setSelectedInmate(null)
  }

  async function registerVisitor(event) {
    event.preventDefault()

    if (!selectedInmate || !selectedInmate.visitationAllowed) {
      setNotice('Search for and select an inmate who is allowed visitors.')
      return
    }

    const visitorData = {
      name: form.name.trim(),
      nationalId: form.nationalId.trim(),
      phone: form.phone.trim(),
      relationshipToInmate: form.relationshipToInmate,
      inmate: selectedInmate.fullName,
      purpose: form.purpose.trim(),
      checkedItems: form.checkedItems,
      date: form.date,
      time: form.time,
    }

    if (
      !visitorData.name ||
      !visitorData.nationalId ||
      !visitorData.phone ||
      !visitorData.relationshipToInmate ||
      !visitorData.purpose ||
      !visitorData.date ||
      !visitorData.time
    ) {
      setNotice('Please complete all required visitor details.')
      return
    }

    setFormBusy(true)
    setNotice('')

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitorData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Could not register visitor.')
      }

      setVisitors((current) => [result, ...current])
      resetRegistrationForm()
      setShowForm(false)
      setNotice('Visitor registered successfully. Request is pending.')
    } catch (error) {
      console.error('Registering visitor failed:', error)
      setNotice(error.message || 'Could not register visitor.')
    } finally {
      setFormBusy(false)
    }
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
          <div className="reference-topbar-right"><span className="secure-pill">● System Secure</span><span>◉ Security Badge #SEC-992</span><span className="role-pill">Role: <strong>Officer-in-Charge</strong></span><span className="officer-avatar">♟</span></div>
        </header>

        <div className="page-content" id="visitor-dashboard">
          <section className="page-heading">
            <div>
              <p className="eyebrow">FACILITY OPERATIONS / RECORDS</p>
              <h1>Visitor Management</h1>
              <p className="page-description">
                Register visitors, verify visitation rights, and record gate
                entry and exit times.
              </p>
            </div>

            <button className="primary-button" type="button" onClick={() => document.querySelector('.reference-registration')?.scrollIntoView({ behavior: 'smooth' })}>
              <span className="plus-sign">+</span>
              Register visitor
            </button>
          </section>

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setNotice('')}
              >
                ×
              </button>
            </div>
          )}

          <section className="stats-grid" aria-label="Visitor statistics">
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Active visitors on site</span>
                <span className="stat-icon stat-blue">♙</span>
              </div>
              <div className="stat-number">{activeVisitorCount}</div>
              <p className="stat-footnote">Checked in and currently on site</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Pending check-ins</span>
                <span className="stat-icon stat-amber">◷</span>
              </div>
              <div className="stat-number">{pendingCount}</div>
                <p className="stat-footnote">Awaiting approval</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Gatehouse status</span>
                <span className="stat-icon stat-green">♙</span>
              </div>
              <div className="stat-number secure-word">SECURE</div>
              <p className="stat-footnote">All systems operational</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Today's total logs</span>
                <span className="stat-icon stat-purple">◴</span>
              </div>
              <div className="stat-number">{todayLogCount}</div>
              <p className="stat-footnote">Visitor records scheduled today</p>
            </article>
          </section>

          <div className="reference-dashboard-grid">
            <div className="reference-left-stack">
              <section className="reference-panel reference-registration">
                <div className="reference-panel-heading"><h2><span>♧</span> Visitor Registration Form (FR-07)</h2><small>Gatehouse Entry Port A</small></div>
                <form className="reference-inline-form" onSubmit={registerVisitor}>
                  <div className="reference-fields-grid">
                    <label>Full Name<input required maxLength="100" placeholder="e.g. Jonathan R. Vance" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
                    <label>National ID / Passport<input required maxLength="60" placeholder="US-99482103-X" value={form.nationalId} onChange={(event) => setForm({ ...form, nationalId: event.target.value })} /></label>
                    <label>Contact Details<input required type="tel" maxLength="30" placeholder="+1 (555) 019-2834" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                    <label>Relationship to Inmate<select required value={form.relationshipToInmate} onChange={(event) => setForm({ ...form, relationshipToInmate: event.target.value })}><option value="">Select relationship</option><option>Legal Counsel / Attorney</option><option>Spouse</option><option>Parent</option><option>Child</option><option>Sibling</option><option>Relative</option><option>Friend</option><option>Other</option></select></label>
                  </div>
                  <label className="reference-wide-field">Inmate Lookup<input required placeholder="Search inmate ID or name..." value={inmateSearch} onChange={(event) => { setInmateSearch(event.target.value); setSelectedInmate(null); setForm({ ...form, inmate: '' }) }} /></label>
                  {lookingUpInmates && <p className="reference-help">Searching inmate records...</p>}
                  {inmateResults.length > 0 && !selectedInmate && <div className="reference-inmate-results">{inmateResults.map((inmate) => <button type="button" key={inmate.fullName} onClick={() => { setSelectedInmate(inmate); setForm({ ...form, inmate: inmate.fullName }); setInmateSearch(inmate.fullName); setInmateResults([]) }}><strong>{inmate.fullName}</strong><span>{inmate.cellBlock} · {inmate.visitationAllowed ? 'Visitation allowed' : 'Restricted'}</span></button>)}</div>}
                  {selectedInmate && <div className="reference-selected-inmate"><strong>{selectedInmate.fullName}</strong><span>{selectedInmate.cellBlock} · {selectedInmate.visitationAllowed ? 'Visitation allowed' : 'Restricted'}</span><button type="button" onClick={() => { setSelectedInmate(null); setInmateSearch(''); setForm({ ...form, inmate: '' }) }}>Change</button></div>}
                  <label className="reference-wide-field">Purpose of Visit<input required maxLength="500" placeholder="Brief reason for visit" value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} /></label>
                  <fieldset className="reference-gate-checks"><legend>Checked Items at Gate (Security Screening)</legend>{['Valid ID', 'Metal Detector Clear', 'No Electronics', 'Bag Tagged'].map((item) => <label key={item}><input type="checkbox" checked={form.checkedItems.includes(item)} onChange={(event) => { const checkedItems = event.target.checked ? [...form.checkedItems, item] : form.checkedItems.filter((checked) => checked !== item); setForm({ ...form, checkedItems }) }} />{item}</label>)}</fieldset>
                  <div className="reference-form-footer"><label>Visit date<input required type="date" min={today} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Visit time<input required type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label><div><button className="outline-button" type="button" onClick={resetRegistrationForm}>Clear Form</button><button className="dark-button" type="submit" disabled={formBusy}>{formBusy ? 'Registering...' : 'Register & Issue Pass'}</button></div></div>
                </form>
              </section>

              <section className="reference-panel reference-lookup">
                <div className="reference-panel-heading"><h2><span>⌕</span> Inmate Lookup & Gatekeeper Minimum Access (FR-11)</h2><small>Confidential Files<br />Restricted</small></div>
                <label className="reference-lookup-search"><input aria-label="Search inmate ID or name" placeholder="Search Inmate ID or Name..." value={inmateSearch} onChange={(event) => { setInmateSearch(event.target.value); setInmateResults([]); setLookingUpInmates(false); setSelectedInmate(null) }} /><span>Lookup</span></label>
                {selectedInmate ? <div className="reference-inmate-card">{selectedInmate.photoUrl ? <img src={selectedInmate.photoUrl} alt={`${selectedInmate.fullName} profile`} /> : <div className="reference-photo-placeholder">{selectedInmate.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>}<div><h3>{selectedInmate.fullName}</h3><p>Cell Block: <strong>{selectedInmate.cellBlock}</strong></p><p>Security, Tier 2</p><small>✓ &nbsp;Verified minimum information displayed</small></div><button type="button" onClick={() => { setForm({ ...form, inmate: selectedInmate.fullName }); document.querySelector('.reference-registration')?.scrollIntoView({ behavior: 'smooth' }) }}>Attach to Session</button></div> : <p className="reference-lookup-empty">Search for an inmate to display permitted details.</p>}
              </section>
            </div>
            <div className="reference-right-stack">
              <section className="reference-panel reference-gatehouse">
                <div className="reference-panel-heading"><h2><span>♧</span> Gatehouse Touch Controls</h2><span className="live-port">LIVE PORT</span></div>
                <label className="gate-visitor-select">Approved visitor<select aria-label="Select an approved visitor" value={gateVisitor?.id || ''} onChange={(event) => setGateVisitorId(event.target.value)}><option value="">Select visitor...</option>{gateCandidates.map((visitor) => <option key={visitor.id} value={visitor.id}>{visitor.name} · {visitor.visitorId}</option>)}</select></label>
                <div className="reference-gate-buttons"><button className="gate-check-in" type="button" disabled={!gateVisitor || Boolean(gateVisitor.entryTimestamp) || busyId !== null} onClick={() => gateVisitor && recordVisitTime(gateVisitor, 'entry')}><span>⇥</span>CHECK-IN</button><button className="gate-check-out" type="button" disabled={!gateVisitor?.entryTimestamp || Boolean(gateVisitor.exitTimestamp) || busyId !== null} onClick={() => gateVisitor && recordVisitTime(gateVisitor, 'exit')}><span>⇤</span>CHECK-OUT</button></div>
                <div className="reference-port-details"><p><span>Active Station Terminal</span><strong>GT-PORT-04</strong></p><p><span>Gatekeeper Officer ID</span><strong>SEC-OFF-882</strong></p><p><span>System Synchronization</span><strong className="optimal-label">Optimal (0.04s)</strong></p></div>
              </section>
              <section className="reference-panel reference-session-logs">
                <div className="reference-panel-heading"><h2><span>▤</span> Active Session Logs</h2><small>Auto-updating</small></div>
                <div className="reference-log-header"><span>VISITOR / INMATE</span><span>ENTRY</span><span>STATUS</span></div>
                {loading ? <p className="reference-log-empty">Loading sessions...</p> : visitors.slice(0, 6).map((visitor) => <div className="reference-log-row" key={visitor.id}><div><strong>{visitor.name}</strong><span>↳ {visitor.inmate}</span></div><time>{visitor.entryTimestamp ? formatTime(new Date(visitor.entryTimestamp).toTimeString().slice(0, 5)) : formatTime(visitor.time)}</time><span className={`reference-log-status ${visitor.exitTimestamp ? 'exited' : visitor.entryTimestamp ? 'onsite' : 'scheduled'}`}>{visitor.exitTimestamp ? 'Exited' : visitor.entryTimestamp ? 'On Site' : visitor.status}</span></div>)}
                {!loading && visitors.length === 0 && <p className="reference-log-empty">No visitor sessions have been recorded.</p>}
              </section>
            </div>
          </div>

          <footer className="page-footer">
            <span>Prison Management System</span>
            <span>Visitor Management · Frontend demonstration</span>
          </footer>
        </div>
      </main>

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !formBusy) {
              setShowForm(false)
            }
          }}
        >
          <section
            className="registration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">VISITOR MANAGEMENT</p>
                <h2 id="registration-title">Register visitor</h2>
                <p>Enter the visitor's information and visit details.</p>
              </div>
              <button
                className="close-modal"
                type="button"
                aria-label="Close registration form"
                disabled={formBusy}
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <form className="registration-form" onSubmit={registerVisitor}>
              <label>
                Visitor's full name
                <input
                  required
                  maxLength="100"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Enter full name"
                />
              </label>

              <label>
                National ID / Passport number
                <input
                  required
                  maxLength="60"
                  value={form.nationalId}
                  onChange={(event) =>
                    setForm({ ...form, nationalId: event.target.value })
                  }
                  placeholder="Enter ID or passport number"
                />
              </label>

              <label>
                Contact number
                <input
                  required
                  type="tel"
                  maxLength="30"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  placeholder="Enter contact number"
                />
              </label>

              <label>
                Relationship to inmate
                <select
                  required
                  value={form.relationshipToInmate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      relationshipToInmate: event.target.value,
                    })
                  }
                >
                  <option value="">Select relationship</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Relative">Other relative</option>
                  <option value="Friend">Friend</option>
                  <option value="Lawyer">Lawyer</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                Search inmate
                <input
                  required
                  value={inmateSearch}
                  onChange={(event) => {
                    setInmateSearch(event.target.value)
                    setInmateResults([])
                    setLookingUpInmates(false)
                    setSelectedInmate(null)
                    setForm({ ...form, inmate: '' })
                  }}
                  placeholder="Type at least 2 letters of the inmate's name"
                />
              </label>

              {lookingUpInmates && <p>Searching inmate records...</p>}

              {inmateResults.length > 0 && !selectedInmate && (
                <div className="inmate-results">
                  {inmateResults.map((inmate) => (
                    <button
                      className="inmate-result"
                      type="button"
                      key={inmate.fullName}
                      onClick={() => {
                        setSelectedInmate(inmate)
                        setForm({ ...form, inmate: inmate.fullName })
                        setInmateSearch(inmate.fullName)
                        setInmateResults([])
                      }}
                    >
                      <strong>{inmate.fullName}</strong>
                      <span>Cell block: {inmate.cellBlock}</span>
                      <span>
                        Visitation:{' '}
                        {inmate.visitationAllowed ? 'Allowed' : 'Restricted'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {inmateSearch.trim().length >= 2 &&
                !lookingUpInmates &&
                !selectedInmate &&
                inmateResults.length === 0 && (
                  <p>No inmate found. Check the spelling and try again.</p>
                )}

              {selectedInmate && (
                <div className="pending-note">
                  <strong>{selectedInmate.fullName}</strong>
                  <p>Cell block: {selectedInmate.cellBlock}</p>
                  <p>
                    Visitation:{' '}
                    {selectedInmate.visitationAllowed
                      ? 'Allowed'
                      : 'Restricted'}
                  </p>
                  <button
                    type="button"
                    className="clear-filters"
                    onClick={() => {
                      setSelectedInmate(null)
                      setInmateSearch('')
                      setForm({ ...form, inmate: '' })
                    }}
                  >
                    Choose another inmate
                  </button>
                </div>
              )}

              <label>
                Purpose of visit
                <textarea
                  required
                  maxLength="500"
                  rows="3"
                  value={form.purpose}
                  onChange={(event) =>
                    setForm({ ...form, purpose: event.target.value })
                  }
                  placeholder="Explain the reason for the visit"
                />
              </label>

              <fieldset className="gate-items">
                <legend>Items checked at the gate</legend>
                {[
                  'Identity verified',
                  'Bags inspected',
                  'Prohibited items checked',
                  'Personal belongings recorded',
                ].map((item) => (
                  <label key={item}>
                    <input
                      type="checkbox"
                      checked={form.checkedItems.includes(item)}
                      onChange={(event) => {
                        const checkedItems = event.target.checked
                          ? [...form.checkedItems, item]
                          : form.checkedItems.filter(
                              (selected) => selected !== item,
                            )

                        setForm({ ...form, checkedItems })
                      }}
                    />
                    {item}
                  </label>
                ))}
              </fieldset>

              <div className="form-row">
                <label>
                  Visit date
                  <input
                    required
                    type="date"
                    min={today}
                    value={form.date}
                    onChange={(event) =>
                      setForm({ ...form, date: event.target.value })
                    }
                  />
                </label>

                <label>
                  Scheduled visit time
                  <input
                    required
                    type="time"
                    value={form.time}
                    onChange={(event) =>
                      setForm({ ...form, time: event.target.value })
                    }
                  />
                </label>
              </div>

              <div className="pending-note">
                New requests start as Pending and require approval. Actual
                gate entry and exit times are recorded separately.
              </div>

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={formBusy}
                  onClick={() => {
                    setShowForm(false)
                    resetRegistrationForm()
                  }}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={formBusy}
                >
                  {formBusy ? 'Please wait...' : 'Register visitor'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
