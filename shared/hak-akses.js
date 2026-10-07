/** Shared permission matrix — imported by server and web client. */
export const HAK_AKSES = {
  Admin: {
    ubahInventori: true,
    lihatPengguna: true,
    ubahPengguna: true,
    ubahToko: true,
  },
  Karyawan: {
    ubahInventori: true,
    lihatPengguna: false,
    ubahPengguna: false,
    ubahToko: false,
  },
  Operator: {
    ubahInventori: false,
    lihatPengguna: false,
    ubahPengguna: false,
    ubahToko: false,
  },
}

export function hakUntuk(peran) {
  return HAK_AKSES[peran] ?? HAK_AKSES.Operator
}
