import { jsPDF } from 'jspdf'

const fontUrls = [new URL('../assets/fonts/NotoSans-Regular.ttf', import.meta.url).href, new URL('../assets/fonts/NotoSans-Bold.ttf', import.meta.url).href]
const logoUrl = new URL('../assets/cinifix.jpg', import.meta.url).href
let fontPromise

function base64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let start = 0; start < bytes.length; start += 8192) binary += String.fromCharCode(...bytes.subarray(start, start + 8192))
  return btoa(binary)
}

async function loadResource(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Unable to load a PDF asset. Please try again.')
  return base64(await response.arrayBuffer())
}

async function loadFonts() {
  if (!fontPromise) fontPromise = Promise.all(fontUrls.map(loadResource)).catch((error) => { fontPromise = undefined; throw error })
  return fontPromise
}

// assets is injectable for offline PDF inspection; browser exports use local assets.
export async function createNarrativePdf(reports, options, events = [], period = {}, assets) {
  if (!reports.length) throw new Error('Choose at least one report to export.')
  const [fonts, logo] = await Promise.all([assets ? Promise.resolve(assets.fonts) : loadFonts(), options.logo ? (assets ? Promise.resolve(assets.logo) : loadResource(logoUrl)) : Promise.resolve(null)])
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true })
  doc.addFileToVFS('NotoSans-Regular.ttf', fonts[0])
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal')
  doc.addFileToVFS('NotoSans-Bold.ttf', fonts[1])
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold')
  doc.setProperties({ title: 'CINIFIX Narrative Reports', author: 'CINIFIX', subject: 'Narrative reports' })
  const eventsById = new Map(events.map((event) => [event._id, event.name]))
  const margin = 20
  const width = 170
  const bottom = 274
  let y = 20

  function font(size = 10, bold = false) {
    doc.setFont('NotoSans', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
  }

  function checkGlyphs(text) {
    const characterMap = doc.getFont().metadata?.cmap?.unicode?.codeMap
    if (!characterMap) throw new Error('Unable to verify the PDF font. Export was stopped to protect the original text.')
    const unsupported = [...text].find((character) => !['\n', '\r', '\t'].includes(character) && !characterMap[character.codePointAt(0)])
    if (unsupported) throw new Error(`The PDF font cannot render character U+${unsupported.codePointAt(0).toString(16).toUpperCase()}. No content was omitted; export was stopped.`)
  }

  function continuation() {
    doc.addPage()
    font(9, true)
    doc.setTextColor(144, 112, 61)
    doc.text('CINIFIX  /  NARRATIVE REPORTS', margin, 17)
    doc.setDrawColor(232, 226, 214)
    doc.line(margin, 22, 190, 22)
    y = 32
  }

  function text(value, { size = 10, bold = false, color = [63, 64, 65], after = 4 } = {}) {
    font(size, bold)
    const raw = String(value ?? '')
    checkGlyphs(raw)
    const lineHeight = size * 0.352778 * 1.65
    // Explicit paragraph splitting retains blank lines and full original text.
    const paragraphs = raw.split(/\r\n|\r|\n/).map((paragraph) => paragraph === '' ? [''] : doc.splitTextToSize(paragraph, width))
    for (const [index, lines] of paragraphs.entries()) {
      const nextLines = paragraphs[index + 1]
      // Keep ordinary paragraphs together and avoid leaving a short lead-in
      // alone at the foot of a page. Longer paragraphs still span pages.
      const requiredLines = lines.length + (lines.length <= 2 && nextLines?.[0] ? nextLines.length : 0)
      if (requiredLines * lineHeight < bottom - 32 && y + requiredLines * lineHeight > bottom) { continuation(); font(size, bold) }
      for (const line of lines) {
        if (y + lineHeight > bottom) { continuation(); font(size, bold) }
        doc.setTextColor(...color)
        doc.text(line, margin, y)
        y += lineHeight
      }
    }
    y += after
  }

  if (logo) doc.addImage(`data:image/jpeg;base64,${logo}`, 'JPEG', margin, 16, 19, 19)
  font(21, true)
  doc.setTextColor(23, 26, 32)
  doc.text('CINIFIX', logo ? 45 : margin, 25)
  font(8)
  doc.setTextColor(113, 111, 103)
  doc.text('Daily Task Monitoring | Allowance Tracking', logo ? 45 : margin, 32)
  doc.setDrawColor(202, 178, 126)
  doc.line(margin, 43, 190, 43)
  y = 55
  text('NARRATIVE REPORTS', { size: 13, bold: true, color: [144, 112, 61], after: 5 })
  if (period.eventName && options.event) text(`Event Name: ${period.eventName}`, { size: 9 })
  const dates = reports.map((report) => report.reportDate).sort()
  text(`Reporting Period: ${period.startDate || dates[0]} to ${period.endDate || dates.at(-1)}`, { size: 9, after: 8 })

  reports.forEach((report, index) => {
    if (index) continuation()
    text(`REPORT ${String(index + 1).padStart(2, '0')} / ${reports.length}`, { size: 8, bold: true, color: [158, 139, 105] })
    if (options.title) text(`Report Title: ${report.title || `Daily Narrative — ${report.reportDate}`}`, { size: 14, bold: true, after: 6 })
    if (options.date) text(`Report Date: ${report.reportDate}`, { size: 9 })
    if (options.creator) text(`Created By: ${report.createdBy}`, { size: 9 })
    if (options.event && eventsById.has(report.eventId)) text(`Event Name: ${eventsById.get(report.eventId)}`, { size: 9 })
    if (options.narrative) {
      y += 5
      text('Narrative Report', { size: 10, bold: true, after: 4 })
      text(report.narrative, { size: 10, after: 0 })
    }
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.setDrawColor(232, 226, 214)
    doc.line(margin, 281, 190, 281)
    font(8)
    doc.setTextColor(145, 136, 120)
    doc.text('CINIFIX', margin, 287)
    if (options.pageNumbers) doc.text(`Page ${page} of ${pageCount}`, 190, 287, { align: 'right' })
  }
  return doc
}
