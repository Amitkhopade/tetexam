export const FREE_PAPER_IDS = new Set([
  'SED-24-I-PAPER-I-H',
  'ACF-26-I-PAPER-I-K',
  'ACF-26-I-PAPER-I-L',
  'ACF-26-I-PAPER-I-M',
  'ACF-26-I-PAPER-I-N',
])

export function isPermanentlyFreePaper(paperId) {
  return FREE_PAPER_IDS.has(String(paperId || '').trim())
}
