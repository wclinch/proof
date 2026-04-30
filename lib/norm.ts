// Shared text normalisation used by both PdfViewer (span matching) and
// AnalysisPanel (highlight toggle detection). Must be identical in both places.
export const normStr = (s: string) =>
  s.replace(/\s+/g, ' ').toLowerCase().trim()
