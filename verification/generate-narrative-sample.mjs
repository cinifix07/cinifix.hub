// Offline layout specimen only. This file never imports a Convex client.
import fs from 'node:fs/promises'
import { createNarrativePdf } from '../src/reports/report-pdf.js'

const encode = async (path) => (await fs.readFile(path)).toString('base64')
const assets = {
  fonts: await Promise.all(['src/assets/fonts/NotoSans-Regular.ttf', 'src/assets/fonts/NotoSans-Bold.ttf'].map(encode)),
  logo: await encode('src/assets/cinifix.jpg'),
}
const paragraph = 'Gipahigayon ang pagmonitor sa adlaw-adlaw nga buluhaton. Résumé, café, piñata, ug malinawon nga pagtinabangay: “Klaro ang tumong — hapsay ang trabaho.” The team reviewed activities, observations, accomplishments, and next steps. Original paragraphs remain complete even when the report continues onto another A4 page.'
const reports = [
  { _id: 'sample-1', title: 'Weekly Activities and Accomplishments', reportDate: '2026-10-26', createdBy: 'CINIFIX Sample', eventId: 'sample-event', narrative: Array.from({ length: 26 }, (_, index) => `Activity ${index + 1}\n${paragraph}`).join('\n\n') },
  { _id: 'sample-2', title: 'Daily Narrative with Preserved Spacing', reportDate: '2026-10-27', createdBy: 'CINIFIX Sample', narrative: 'Opening observations.\n\nA second paragraph with accented text: mañana, café, résumé.\n\nFinal line: ALL ORIGINAL CONTENT INCLUDED.' },
]
const doc = await createNarrativePdf(reports, { logo: true, title: true, date: true, creator: true, narrative: true, event: true, pageNumbers: true }, [{ _id: 'sample-event', name: 'October Activity Review' }], {}, assets)
await fs.mkdir('output/pdf', { recursive: true })
await fs.writeFile('output/pdf/narrative-layout-sample.pdf', new Uint8Array(doc.output('arraybuffer')))
console.log(`Static sample: ${doc.getNumberOfPages()} A4 pages, 2 synthetic reports, accented UTF-8 text. No backend calls.`)
