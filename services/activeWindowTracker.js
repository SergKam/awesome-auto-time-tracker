import {exec} from 'child_process'
import sqlite3 from 'sqlite3'

let fileName = 'activeWindow.sqlite'
let interval = 10000
let timer = null
let db
let lastProcess = ''
let lastTitle = ''
let lastId

const asAsync = async (cmd) =>
    new Promise((resolve, reject) =>
        cmd((err, value) =>
            err ? reject(err) : resolve(value)
        )
    )

const sh = async (cmd) => {
  const out = await asAsync(exec.bind(null, cmd))
  return out.toString().trim()
}


const getWindowName = async () => await sh('xdotool getactivewindow getwindowname')

const getProcessName = async () => await sh('ps  -o args --no-header -p `xdotool getactivewindow getwindowpid`')

const recordInsert = async (process, title) =>
    new Promise((resolve, reject) => {
      db.run(`INSERT INTO log(start_time, end_time, process, title)
              VALUES (DATETIME('now'), DATETIME('now'), ?, ?)`,
          [process, title],
          function (err) {
            if (err) {
              reject(err)
            } else {
              resolve(this.lastID)
            }
          }
      )
    })


const recordUpdate = (theLastId) =>
    asAsync(db.run.bind(db,
          `UPDATE log
           SET end_time = DATETIME('now')
           WHERE rowid = ?`,
        [theLastId]))


const addRecord = async () => {
  try {
    const process = await getProcessName()
    const title = await getWindowName()
    if (lastProcess === process && lastTitle === title) {
      await recordUpdate(lastId)
    } else {
      lastProcess = process
      lastTitle = title
      lastId = await recordInsert(process, title)
    }
  } catch (e) {
    console.error('Oops! Something wrong collecting active window stats', e)
  }
}


export const start = () => {
  stop()
  db = new sqlite3.Database(fileName, (err) => {
    if (err) {
      throw new Error(err)
    }
    console.log('Connected to the database.')

    db.run(`CREATE TABLE IF NOT EXISTS log
            (
                start_time text DEFAULT CURRENT_TIMESTAMP,
                end_time   text,
                process    text,
                title      text,
                comment    text,
                tags       text
            )`)
    timer = setInterval(addRecord, interval)
  })
}

export const stop = () => {
  timer && clearInterval(timer)
  db && db.close((err) => {
    if (err) {
      throw new Error(err)
    }
    console.log('Close the database connection.')
  })
}


export const read = (filter = 'SELECT * FROM log') => asAsync(db.all.bind(db,
    filter, []))
