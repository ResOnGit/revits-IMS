import { daftarKategori, KATEGORI_MAX_LEN } from '../../shared/kategori.js'
import { SuggestPicker } from './SuggestPicker'

export function KategoriPicker({ value, onChange, options = [], disabled }) {
  return (
    <SuggestPicker
      value={value}
      onChange={onChange}
      options={options}
      susun={daftarKategori}
      placeholder="Ketik atau pilih…"
      disabled={disabled}
      maxLength={KATEGORI_MAX_LEN}
      tambahLabel="Tambah kategori"
      required
    />
  )
}
