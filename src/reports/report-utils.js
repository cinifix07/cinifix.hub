export function localReportDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function reportTitle(report) {
  return report.title || `Daily Narrative — ${report.reportDate}`
}

export function displayReportDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function filterReports(reports, { search = '', date = '', eventId = '', order = 'newest' }, events = []) {
  const term = search.trim().toLocaleLowerCase()
  const eventNames = new Map(events.map((event) => [event._id, event.name]))
  return reports.filter((report) => (!date || report.reportDate === date) && (!eventId || (eventId === 'none' ? !report.eventId : report.eventId === eventId)) && (!term || [reportTitle(report), report.narrative, report.createdBy, eventNames.get(report.eventId)].some((value) => String(value || '').toLocaleLowerCase().includes(term))))
    .sort((a, b) => {
      const difference = (a.createdAt ?? a._creationTime) - (b.createdAt ?? b._creationTime)
      return (order === 'oldest' ? difference : -difference) || a._id.localeCompare(b._id)
    })
}

export function exportReports(reports, { scope, selectedIds, eventId, startDate, endDate }) {
  if (scope === 'selected') return reports.filter((report) => selectedIds.has(report._id))
  if (scope === 'event') return eventId ? reports.filter((report) => report.eventId === eventId) : []
  if (!startDate || !endDate || startDate > endDate) return []
  return reports.filter((report) => report.reportDate >= startDate && report.reportDate <= endDate)
}
