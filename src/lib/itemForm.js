export const FORM_KOSONG = {
  kode: '',
  nama: '',
  kategori: '',
  jenis: '',
  satuan: '',
  stokMinimum: '0',
  stokAwal: '0',
  hargaJual: '',
  hargaKomplit: '',
  hargaSaja: '',
  kondisi: '',
  catatan: '',
}

export function itemKeForm(item) {
  return {
    kode: item.kode,
    nama: item.nama,
    kategori: item.kategori,
    jenis: item.jenis,
    satuan: item.satuan,
    stokMinimum: String(item.stokMinimum ?? 0),
    stokAwal: '0',
    hargaJual: item.hargaJual != null ? String(item.hargaJual) : '',
    hargaKomplit: item.hargaKomplit != null ? String(item.hargaKomplit) : '',
    hargaSaja: item.hargaSaja != null ? String(item.hargaSaja) : '',
    kondisi: item.kondisi ?? '',
    catatan: item.catatan ?? '',
  }
}
