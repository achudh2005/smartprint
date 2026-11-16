/**
 * Lightweight client-side CSV export helper
 */
export function exportToCsv(filename, rows, columns) {
  if (!rows || !rows.length || !columns || !columns.length) {
    return false
  }

  const header = columns.map((c) => `"${(c.label || c.key).replace(/"/g, '""')}"`).join(',')

  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          let val = col.accessor ? col.accessor(row) : row[col.key]
          if (val === null || val === undefined) val = ''
          val = String(val).replace(/"/g, '""')
          return `"${val}"`
        })
        .join(',')
    )
    .join('\r\n')

  const csvContent = '\uFEFF' + header + '\r\n' + body
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return true
}
