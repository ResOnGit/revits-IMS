export const ADMIN_AWAL = {
  id: 'u-1',
  nama: 'REVITS Admin',
  email: 'miihendraa@gmail.com',
  peran: 'Admin',
  status: 'Aktif',
  keterangan: '',
}

export function seedIfEmpty(db) {
  const n = db.prepare('SELECT COUNT(*) AS n FROM pengguna').get().n
  if (n > 0) return false

  const insertToko = db.prepare(`
    INSERT INTO toko (id, nama, nama_pendek, merk, tagline, alamat, telepon, catatan)
    VALUES (1, '', '', '', '', '', '', '')
  `)
  const insertUser = db.prepare(`
    INSERT INTO pengguna (id, nama, email, peran, status, keterangan)
    VALUES (@id, @nama, @email, @peran, @status, @keterangan)
  `)

  const tx = db.transaction(() => {
    insertToko.run()
    insertUser.run(ADMIN_AWAL)
  })
  tx()
  return true
}
