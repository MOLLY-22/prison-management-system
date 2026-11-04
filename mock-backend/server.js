
const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')
const path = require('path')
const crypto = require('crypto')

const app = express()
const PORT = 5000
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const demoEmail = process.env.DEMO_AUTH_EMAIL ||
  (process.env.NODE_ENV === 'production' ? '' : 'admin@prison.local')
const demoPassword = process.env.DEMO_AUTH_PASSWORD ||
  (process.env.NODE_ENV === 'production' ? '' : 'DemoPrison2026!')
const sessions = new Map()

const db = new Database(path.join(__dirname, 'visitors.db'))

app.use(cors())
app.use(express.json())

// Create the visitors table.
db.exec(`
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitorId TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    inmate TEXT NOT NULL,
    phone TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending'
  )
`)

// Safely add new fields to an existing database.
const existingColumns = new Set(
  db.prepare('PRAGMA table_info(visitors)').all().map((column) => column.name),
)

const newColumns = {
  nationalId: 'TEXT',
  relationshipToInmate: 'TEXT',
  purpose: 'TEXT',
  checkedItems: "TEXT NOT NULL DEFAULT '[]'",
  entryTimestamp: 'TEXT',
  exitTimestamp: 'TEXT',
}

for (const [column, definition] of Object.entries(newColumns)) {
  if (!existingColumns.has(column)) {
    db.exec(`ALTER TABLE visitors ADD COLUMN ${column} ${definition}`)
  }
}

// Store only the minimum information needed by gatekeepers.
// These are demonstration records, not real inmate records.
db.exec(`
  CREATE TABLE IF NOT EXISTS inmates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL UNIQUE,
    cellBlock TEXT NOT NULL,
    photoUrl TEXT,
    visitationAllowed INTEGER NOT NULL DEFAULT 1
  )
`)

const inmateCount = db.prepare(
  'SELECT COUNT(*) AS total FROM inmates',
).get().total

if (inmateCount === 0) {
  const addInmate = db.prepare(`
    INSERT INTO inmates
      (fullName, cellBlock, photoUrl, visitationAllowed)
    VALUES (?, ?, ?, ?)
  `)

  const seedInmates = [
    ['Peter Phiri', 'Block A', null, 1],
    ['John Zulu', 'Block B', null, 1],
    ['James Gondwe', 'Block C', null, 1],
    ['Jonson made', 'Block A', null, 1],
  ]

  const insertInmates = db.transaction((records) => {
    for (const inmate of records) {
      addInmate.run(...inmate)
    }
  })

  insertInmates(seedInmates)
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    badgeId TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    facility TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active'
  )
`)

const userCount = db.prepare('SELECT COUNT(*) AS total FROM users').get().total

if (userCount === 0) {
  const insertUser = db.prepare(`
    INSERT INTO users (name, badgeId, role, facility, status)
    VALUES (?, ?, ?, ?, ?)
  `)

  const seedUsers = [
    ['Commander John Davis', 'SEC-00412', 'Officer-in-Charge', 'Block A - Maximum', 'Active'],
    ['Sarah Miller', 'SEC-00891', 'Security Officer', 'Block B - Medium', 'Active'],
    ['Robert King', 'SEC-01104', 'Prison Officer', 'Block C - General', 'Active'],
    ['Alan Lee', 'SEC-01459', 'Security Officer', 'Block A - Maximum', 'Active'],
  ]

  const insertUsers = db.transaction((records) => {
    for (const user of records) insertUser.run(...user)
  })

  insertUsers(seedUsers)
}

// Add sample visitors only when the visitors table is empty.
const visitorCount = db.prepare(
  'SELECT COUNT(*) AS total FROM visitors',
).get().total

if (visitorCount === 0) {
  const insertVisitor = db.prepare(`
    INSERT INTO visitors
      (visitorId, name, inmate, phone, date, time, status)
    VALUES
      (@visitorId, @name, @inmate, @phone, @date, @time, @status)
  `)

  const seedVisitors = [
    {
      visitorId: 'VIS001',
      name: 'Thoko Banda',
      inmate: 'Peter Phiri',
      phone: '0991 234 567',
      date: '2026-10-14',
      time: '09:00',
      status: 'Approved',
    },
    {
      visitorId: 'VIS002',
      name: 'Grace Chirwa',
      inmate: 'John Zulu',
      phone: '0882 345 678',
      date: '2026-10-14',
      time: '10:30',
      status: 'Pending',
    },
    {
      visitorId: 'VIS003',
      name: 'Blessings Mbewe',
      inmate: 'James Gondwe',
      phone: '0999 456 789',
      date: '2026-10-14',
      time: '11:00',
      status: 'Approved',
    },
    {
      visitorId: 'VIS004',
      name: 'mark doss',
      inmate: 'Jonson made',
      phone: '0998877661',
      date: '2026-10-14',
      time: '09:00',
      status: 'Approved',
    },
  ]

  const insertMany = db.transaction((records) => {
    for (const visitor of records) {
      insertVisitor.run(visitor)
    }
  })

  insertMany(seedVisitors)
}

// Convert stored JSON into an array for the frontend.
function formatVisitor(visitor) {
  const checkedItems = (() => {
    try {
      const parsed = JSON.parse(visitor.checkedItems || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })()

  return { ...visitor, checkedItems }
}

app.get('/', (req, res) => {
  res.json({ message: 'SQLite mock backend is running!' })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'mock-backend' })
})

function secureStringEqual(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  return leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || ''
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''
  const session = sessions.get(token)

  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token)
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
  }

  req.authToken = token
  req.authUser = session.user
  return next()
}

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  if (!demoEmail || !demoPassword) {
    return res.status(503).json({ message: 'Authentication is not configured on this server.' })
  }

  if (
    !secureStringEqual(email, demoEmail.toLowerCase()) ||
    !secureStringEqual(password, demoPassword)
  ) {
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  const user = {
    id: 'demo-admin',
    name: 'Prison System Administrator',
    email: demoEmail,
    role: 'Administrator',
  }
  const token = crypto.randomBytes(32).toString('hex')

  sessions.set(token, {
    user,
    expiresAt: Date.now() + SESSION_TTL_MS,
  })

  return res.json({ token, user })
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.authUser })
})

app.post('/api/auth/logout', requireAuth, (req, res) => {
  sessions.delete(req.authToken)
  res.json({ message: 'Signed out successfully.' })
})

app.get('/api/users', requireAuth, (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY id').all()
  res.json(users)
})

app.post('/api/users', requireAuth, (req, res) => {
  const name = String(req.body.name || '').trim()
  const badgeId = String(req.body.badgeId || '').trim()
  const role = String(req.body.role || '').trim()
  const facility = String(req.body.facility || '').trim()
  const status = String(req.body.status || 'Active').trim()

  if (!name || !badgeId || !role || !facility) {
    return res.status(400).json({
      message: 'Name, badge ID, role, and facility are required.',
    })
  }

  try {
    const result = db.prepare(`
      INSERT INTO users (name, badgeId, role, facility, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, badgeId, role, facility, status)

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
    return res.status(201).json(user)
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'That badge ID is already assigned.' })
    }

    console.error('Creating user failed:', error.message)
    return res.status(500).json({ message: 'Could not create user.' })
  }
})

app.patch('/api/users/:id/role', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const role = String(req.body.role || '').trim()

  if (!Number.isInteger(id) || !role) {
    return res.status(400).json({ message: 'A valid user ID and role are required.' })
  }

  const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
  if (result.changes === 0) {
    return res.status(404).json({ message: 'User not found.' })
  }

  return res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(id))
})

app.patch('/api/users/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'A valid user ID is required.' })
  }

  const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  if (!currentUser) {
    return res.status(404).json({ message: 'User not found.' })
  }

  const updatedUser = {
    name: String(req.body.name ?? currentUser.name).trim(),
    badgeId: String(req.body.badgeId ?? currentUser.badgeId).trim(),
    role: String(req.body.role ?? currentUser.role).trim(),
    facility: String(req.body.facility ?? currentUser.facility).trim(),
    status: String(req.body.status ?? currentUser.status).trim(),
  }

  if (!updatedUser.name || !updatedUser.badgeId || !updatedUser.role || !updatedUser.facility) {
    return res.status(400).json({
      message: 'Name, badge ID, role, and facility are required.',
    })
  }

  try {
    db.prepare(`
      UPDATE users
      SET name = ?, badgeId = ?, role = ?, facility = ?, status = ?
      WHERE id = ?
    `).run(
      updatedUser.name,
      updatedUser.badgeId,
      updatedUser.role,
      updatedUser.facility,
      updatedUser.status,
      id,
    )

    return res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(id))
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'That badge ID is already assigned.' })
    }

    console.error('Updating user failed:', error.message)
    return res.status(500).json({ message: 'Could not update user.' })
  }
})

app.delete('/api/users/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'A valid user ID is required.' })
  }

  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id)
  if (result.changes === 0) {
    return res.status(404).json({ message: 'User not found.' })
  }

  return res.json({ message: 'User deleted successfully.' })
})

// List visitor records.
app.get('/api/visitors', (req, res) => {
  const visitors = db.prepare(
    'SELECT * FROM visitors ORDER BY id DESC',
  ).all()

  res.json(visitors.map(formatVisitor))
})

// Search inmates. Only minimum gatekeeper information is returned.
app.get('/api/inmates', (req, res) => {
  const search = String(req.query.search || '').trim()

  if (search.length < 2) {
    return res.json([])
  }

  const inmates = db.prepare(`
    SELECT fullName, cellBlock, photoUrl, visitationAllowed
    FROM inmates
    WHERE fullName LIKE ?
    ORDER BY fullName
    LIMIT 10
  `).all(`%${search}%`)

  res.json(
    inmates.map((inmate) => ({
      ...inmate,
      visitationAllowed: Boolean(inmate.visitationAllowed),
    })),
  )
})

// Register a visitor.
app.post('/api/visitors', (req, res) => {
  const {
    name,
    inmate,
    phone,
    date,
    time,
    nationalId,
    relationshipToInmate,
    purpose,
    checkedItems,
  } = req.body

  if (
    !name?.trim() ||
    !inmate?.trim() ||
    !phone?.trim() ||
    !date ||
    !time
  ) {
    return res.status(400).json({
      message: 'Please provide the required visitor details.',
    })
  }

  const inmateRecord = db.prepare(`
    SELECT visitationAllowed
    FROM inmates
    WHERE LOWER(fullName) = LOWER(?)
  `).get(inmate.trim())

  if (!inmateRecord) {
    return res.status(400).json({
      message: 'Please select a valid inmate from the lookup results.',
    })
  }

  if (!inmateRecord.visitationAllowed) {
    return res.status(400).json({
      message: 'Visitation is not currently allowed for this inmate.',
    })
  }

  const nextNumber = db.prepare(`
    SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM visitors
  `).get().nextId

  const visitorId = `VIS${String(nextNumber).padStart(3, '0')}`

  const items = Array.isArray(checkedItems)
    ? checkedItems
    : []

  try {
    const result = db.prepare(`
      INSERT INTO visitors (
        visitorId, name, inmate, phone, date, time, status,
        nationalId, relationshipToInmate, purpose, checkedItems
      )
      VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?)
    `).run(
      visitorId,
      name.trim(),
      inmate.trim(),
      phone.trim(),
      date,
      time,
      String(nationalId || '').trim(),
      String(relationshipToInmate || '').trim(),
      String(purpose || '').trim(),
      JSON.stringify(items),
    )

    const visitor = db.prepare(
      'SELECT * FROM visitors WHERE id = ?',
    ).get(result.lastInsertRowid)

    res.status(201).json(formatVisitor(visitor))
  } catch (error) {
    console.error('Registering visitor failed:', error.message)
    res.status(500).json({ message: 'Could not register visitor.' })
  }
})

// Approve or reject a visitor request.
app.patch('/api/visitors/:id/status', (req, res) => {
  const { status } = req.body
  const id = Number(req.params.id)

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({
      message: 'Status must be Approved or Rejected.',
    })
  }

  const result = db.prepare(`
    UPDATE visitors SET status = ? WHERE id = ?
  `).run(status, id)

  if (result.changes === 0) {
    return res.status(404).json({ message: 'Visitor not found.' })
  }

  const visitor = db.prepare(
    'SELECT * FROM visitors WHERE id = ?',
  ).get(id)

  res.json(formatVisitor(visitor))
})

// Record the official entry timestamp.
app.post('/api/visitors/:id/entry', (req, res) => {
  const id = Number(req.params.id)

  const visitor = db.prepare(
    'SELECT * FROM visitors WHERE id = ?',
  ).get(id)

  if (!visitor) {
    return res.status(404).json({ message: 'Visitor not found.' })
  }

  if (visitor.status !== 'Approved') {
    return res.status(400).json({
      message: 'Only approved visitors can be checked in.',
    })
  }

  if (visitor.entryTimestamp) {
    return res.status(400).json({
      message: 'An entry timestamp has already been recorded.',
    })
  }

  const timestamp = new Date().toISOString()

  db.prepare(`
    UPDATE visitors SET entryTimestamp = ? WHERE id = ?
  `).run(timestamp, id)

  res.json(formatVisitor(
    db.prepare('SELECT * FROM visitors WHERE id = ?').get(id),
  ))
})

// Record the official exit timestamp.
app.post('/api/visitors/:id/exit', (req, res) => {
  const id = Number(req.params.id)

  const visitor = db.prepare(
    'SELECT * FROM visitors WHERE id = ?',
  ).get(id)

  if (!visitor) {
    return res.status(404).json({ message: 'Visitor not found.' })
  }

  if (!visitor.entryTimestamp) {
    return res.status(400).json({
      message: 'Record the visitor entry before recording their exit.',
    })
  }

  if (visitor.exitTimestamp) {
    return res.status(400).json({
      message: 'An exit timestamp has already been recorded.',
    })
  }

  const timestamp = new Date().toISOString()

  db.prepare(`
    UPDATE visitors SET exitTimestamp = ? WHERE id = ?
  `).run(timestamp, id)

  res.json(formatVisitor(
    db.prepare('SELECT * FROM visitors WHERE id = ?').get(id),
  ))
})

// Delete a visitor record.
app.delete('/api/visitors/:id', (req, res) => {
  const result = db.prepare(
    'DELETE FROM visitors WHERE id = ?',
  ).run(Number(req.params.id))

  if (result.changes === 0) {
    return res.status(404).json({ message: 'Visitor not found.' })
  }

  res.json({ message: 'Visitor deleted successfully.' })
})

app.listen(PORT, () => {
  console.log(`SQLite mock backend running at http://localhost:${PORT}`)
})
