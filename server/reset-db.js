import './load-env.js'
import { openDb, resetAndSeed } from './db.js'

const { db } = openDb()
resetAndSeed(db)
db.close()
console.log('Database wiped and re-seeded. Blank shop + REVITS Admin is back.')
