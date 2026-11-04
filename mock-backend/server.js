
const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')
const path = require('path')

const app = express()
const PORT = 5000

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
