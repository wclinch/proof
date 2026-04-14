import { createRequire } from 'module'

const _req = createRequire(process.cwd() + '/x.js')
// eslint-disable-next-line no-eval
const pdfParse = eval('_req')('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text
    .replace(/\r\n/g, '\n')
    .replace(/([a-z])-\n([a-z])/g, '$1$2')   // rejoin hyphenated line-breaks
    .replace(/([^\n])\n([^\n])/g, '$1 $2')    // collapse visual line-wraps to spaces
    .replace(/\n{2,}/g, '\n\n')               // normalise paragraph breaks
    .replace(/[ \t]+/g, ' ')
    .trim()
}
