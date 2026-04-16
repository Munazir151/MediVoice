'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Languages, Loader2, Pill, Upload, UserRound, Volume2 } from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { analyzeMedicalReport, type DocumentType, type MedicalAnalysisOutput, type OutputLanguage } from '@/lib/report-analysis-backend';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function severityClass(level: 'LOW' | 'MEDIUM' | 'HIGH') {
  if (level === 'HIGH') return 'border-red-400/40 bg-red-500/15 text-red-100';
  if (level === 'MEDIUM') return 'border-amber-400/40 bg-amber-500/15 text-amber-100';
  return 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100';
}

function testClass(status: 'NORMAL' | 'ABNORMAL') {
  return status === 'ABNORMAL'
    ? 'border-red-400/30 bg-red-500/10 text-red-100'
    : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
}

function speechSynthesisLang(selected: OutputLanguage): string {
  if (selected === 'Hindi') return 'hi-IN';
  if (selected === 'Kannada') return 'kn-IN';
  if (selected === 'Marathi') return 'mr-IN';
  if (selected === 'Bengali') return 'bn-IN';
  if (selected === 'Tamil') return 'ta-IN';
  return 'en-US';
}

function escapeHtml(raw: string) {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeOutput(input: MedicalAnalysisOutput): MedicalAnalysisOutput {
  return {
    ...input,
    patient_info: input.patient_info ?? { name: '', age: '', gender: '' },
    clinical_findings: Array.isArray(input.clinical_findings) ? input.clinical_findings : [],
    medicines: Array.isArray(input.medicines) ? input.medicines : [],
    tests: Array.isArray(input.tests) ? input.tests : [],
    interactions: Array.isArray(input.interactions) ? input.interactions : [],
    health_summary: input.health_summary ?? '',
    summary: input.summary ?? '',
    translated_summary: input.translated_summary ?? '',
  };
}

export default function ReportAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('report');
  const [language, setLanguage] = useState<OutputLanguage>('English');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MedicalAnalysisOutput | null>(null);

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return;
    }

    const id = window.setInterval(() => {
      setProgress((prev) => (prev >= 92 ? prev : prev + 8));
    }, 450);

    return () => window.clearInterval(id);
  }, [loading]);

  const hasOutput = useMemo(() => Boolean(result), [result]);

  const onFileSelected = (selected?: File | null) => {
    if (!selected) {
      setFile(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError('Invalid file type. Upload PDF, JPG, or PNG.');
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum allowed size is 10MB.');
      return;
    }

    setError(null);
    setFile(selected);
  };

  const onAnalyze = async () => {
    if (!file) {
      setError('Please upload a document first.');
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const analyzed = await analyzeMedicalReport({
        file,
        documentType,
        language,
      });

      setProgress(100);
      setResult(normalizeOutput(analyzed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const onPlayReadout = () => {
    if (!result) return;

    const text = result.translated_summary || result.health_summary || result.summary;
    if (!text) return;

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setError('Speech synthesis is not supported in this browser.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechSynthesisLang(language);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const onDownloadPdf = () => {
    if (!result || typeof window === 'undefined') return;

    const summaryText = result.translated_summary || result.health_summary || result.summary || 'N/A';

    const findingsMarkup =
      result.clinical_findings.length > 0
        ? result.clinical_findings
            .map(
              (finding) =>
                `<li><strong>${escapeHtml(finding.title || 'Clinical finding')}:</strong> ${escapeHtml(finding.explanation || 'N/A')}</li>`,
            )
            .join('')
        : '<li>No notable findings extracted.</li>';

    const testsMarkup =
      result.tests.length > 0
        ? result.tests
            .map(
              (test) => `
            <tr>
              <td style="border:1px solid #6ea8fe;padding:8px;font-weight:600;">${escapeHtml(test.parameter || 'N/A')}</td>
              <td style="border:1px solid #6ea8fe;padding:8px;">${escapeHtml(test.value || 'N/A')}</td>
              <td style="border:1px solid #6ea8fe;padding:8px;">${escapeHtml(test.unit || 'N/A')}</td>
              <td style="border:1px solid #6ea8fe;padding:8px;">${escapeHtml(test.range || 'N/A')}</td>
              <td style="border:1px solid #6ea8fe;padding:8px;">${escapeHtml(test.explanation || test.status)}</td>
            </tr>
          `,
            )
            .join('')
        : '<tr><td colspan="5" style="border:1px solid #6ea8fe;padding:8px;">No test values extracted.</td></tr>';

    const html = `
      <html>
        <head><title>Medical Analysis Report</title></head>
        <body style="font-family: Georgia, 'Times New Roman', serif; padding: 24px; background:#111827; color:#f9fafb;">
          <h1 style="color:#93c5fd;">Medical Analysis Report</h1>
          <h2 style="color:#93c5fd;">Patient Information</h2>
          <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
            <tr>
              <td style="border:1px solid #6ea8fe;padding:8px;">Name: ${escapeHtml(result.patient_info?.name || 'N/A')}</td>
              <td style="border:1px solid #6ea8fe;padding:8px;">Age: ${escapeHtml(result.patient_info?.age || 'N/A')}</td>
              <td style="border:1px solid #6ea8fe;padding:8px;">Gender: ${escapeHtml(result.patient_info?.gender || 'N/A')}</td>
            </tr>
          </table>
          <h2 style="color:#93c5fd;">Health Summary</h2>
          <p>${escapeHtml(summaryText)}</p>
          <h2 style="color:#93c5fd;">Clinical Findings Explained</h2>
          <ul>${findingsMarkup}</ul>
          <h2 style="color:#93c5fd;">Lab Results Insights</h2>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="border:1px solid #6ea8fe;padding:8px;text-align:left;">Test Name</th>
                <th style="border:1px solid #6ea8fe;padding:8px;text-align:left;">Result</th>
                <th style="border:1px solid #6ea8fe;padding:8px;text-align:left;">Unit</th>
                <th style="border:1px solid #6ea8fe;padding:8px;text-align:left;">Ref. Range</th>
                <th style="border:1px solid #6ea8fe;padding:8px;text-align:left;">Explanation</th>
              </tr>
            </thead>
            <tbody>${testsMarkup}</tbody>
          </table>
          <h2 style="color:#93c5fd;">Medicines Explained</h2>
          <ul>
            ${result.medicines
              .map(
                (m) =>
                  `<li><strong>${escapeHtml(m.name || 'Unknown medicine')}:</strong> ${escapeHtml(
                    m.what_it_is || m.purpose || 'Medicine details not available.',
                  )} ${escapeHtml(m.what_it_does || '')}</li>`,
              )
              .join('') || '<li>No medicines extracted.</li>'}
          </ul>
        </body>
      </html>
    `;

    const printable = window.open('', '_blank');
    if (!printable) {
      setError('Popup blocked. Allow popups to download PDF.');
      return;
    }

    printable.document.write(html);
    printable.document.close();
    printable.focus();
    printable.print();
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-8">
        <section className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">AI Medical Report Analysis</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Upload a prescription or lab report, extract medicines and test values, detect risks using Qdrant, and get a patient-friendly explanation.
          </p>
        </section>

        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-black/10 p-4 text-center hover:border-primary/40">
                <Upload className="mb-3 h-6 w-6 text-primary" />
                <p className="text-sm font-semibold">Upload Document</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
                />
                {file && <p className="mt-3 break-all text-xs text-primary">{file.name}</p>}
              </label>

              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Document type</p>
                <select
                  className="w-full rounded-md border border-white/10 bg-background/70 px-3 py-2 text-sm"
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value as DocumentType)}
                >
                  <option value="prescription">Prescription</option>
                  <option value="report">Report</option>
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Language</p>
                <select
                  className="w-full rounded-md border border-white/10 bg-background/70 px-3 py-2 text-sm"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as OutputLanguage)}
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Marathi">Marathi</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Auto">Auto</option>
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Actions</p>
                <div className="grid gap-2">
                  <Button onClick={onAnalyze} disabled={loading || !file}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Analyze
                  </Button>
                  <Button variant="secondary" onClick={onPlayReadout} disabled={!hasOutput}>
                    <Volume2 className="h-4 w-4" /> Voice Readout
                  </Button>
                  <Button variant="outline" onClick={onDownloadPdf} disabled={!hasOutput}>
                    Download as PDF
                  </Button>
                </div>
              </div>
            </div>

            {loading && (
              <div className="mt-5 rounded-xl border border-primary/20 bg-primary/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing document with AI + Qdrant...
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {error && <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          </CardContent>
        </Card>

        {result && (
          <section className="mt-8 space-y-5">
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-5">
                <p className="mb-3 flex items-center gap-2 text-xl font-semibold"><UserRound className="h-5 w-5 text-primary" /> Patient Information</p>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm">Name: {result.patient_info?.name || 'N/A'}</div>
                  <div className="rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm">Age: {result.patient_info?.age || 'N/A'}</div>
                  <div className="rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm">Gender: {result.patient_info?.gender || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-5">
                <p className="mb-3 text-xl font-semibold">Health Summary</p>
                <p className="text-base leading-7 text-slate-200">{result.translated_summary || result.health_summary || result.summary || 'No summary generated.'}</p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-5">
                <p className="mb-3 text-xl font-semibold">Clinical Findings Explained</p>
                {result.clinical_findings.length === 0 && <p className="text-sm text-muted-foreground">No notable findings extracted.</p>}
                {result.clinical_findings.length > 0 && (
                  <ul className="list-disc space-y-2 pl-5 text-base text-slate-200">
                    {result.clinical_findings.map((finding, index) => (
                      <li key={`${finding.title}-${index}`}>
                        <span className="font-semibold">{finding.title || 'Clinical finding'}:</span> {finding.explanation || 'N/A'}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-5">
                <p className="mb-3 text-xl font-semibold">Lab Results Insights</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-black/20 text-left text-slate-200">
                        <th className="border border-white/10 px-3 py-2">Test Name</th>
                        <th className="border border-white/10 px-3 py-2">Result</th>
                        <th className="border border-white/10 px-3 py-2">Unit</th>
                        <th className="border border-white/10 px-3 py-2">Ref. Range</th>
                        <th className="border border-white/10 px-3 py-2">Explanation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.tests.length === 0 && (
                        <tr>
                          <td colSpan={5} className="border border-white/10 px-3 py-3 text-muted-foreground">No test values extracted.</td>
                        </tr>
                      )}
                      {result.tests.map((test, index) => (
                        <tr key={`${test.parameter}-${index}`} className="align-top">
                          <td className="border border-white/10 px-3 py-2 font-semibold text-slate-100">{test.parameter || 'N/A'}</td>
                          <td className={`border border-white/10 px-3 py-2 ${test.status === 'ABNORMAL' ? 'text-red-300' : 'text-emerald-300'}`}>{test.value || 'N/A'} {test.status === 'ABNORMAL' ? '(Abnormal)' : '(Normal)'}</td>
                          <td className="border border-white/10 px-3 py-2 text-slate-100">{test.unit || 'N/A'}</td>
                          <td className="border border-white/10 px-3 py-2 text-slate-100">{test.range || 'N/A'}</td>
                          <td className="border border-white/10 px-3 py-2 text-slate-200">{test.explanation || 'No explanation available.'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-5">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Pill className="h-4 w-4 text-primary" /> Medicines</p>
                <div className="space-y-2">
                  {result.medicines.length === 0 && <p className="text-sm text-muted-foreground">No medicines extracted.</p>}
                  {result.medicines.map((med, index) => (
                    <div key={`${med.name}-${index}`} className="rounded-lg border border-white/10 bg-black/10 p-3 text-sm">
                      <p className="font-semibold text-slate-100">{med.name || 'Unknown medicine'}</p>
                      <p className="text-xs text-slate-300">Dose: {med.dose || 'N/A'} | Frequency: {med.frequency || 'N/A'}</p>
                      <p className="mt-1 text-xs text-slate-200">Purpose: {med.purpose || 'N/A'}</p>
                      <p className="mt-1 text-xs text-slate-200">What it is: {med.what_it_is || 'N/A'}</p>
                      <p className="mt-1 text-xs text-slate-200">What it does: {med.what_it_does || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-5">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Pill className="h-4 w-4 text-primary" /> Drug Interactions</p>
                <div className="space-y-2">
                  {result.interactions.length === 0 && <p className="text-sm text-muted-foreground">No interaction risk detected.</p>}
                  {result.interactions.map((interaction, index) => (
                    <div key={`${interaction.drug1}-${interaction.drug2}-${index}`} className="rounded-lg border border-white/10 bg-black/10 p-3 text-sm">
                      <p className="font-semibold text-slate-100">{interaction.drug1} + {interaction.drug2}</p>
                      <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${severityClass(interaction.severity)}`}>
                        {interaction.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-5">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Languages className="h-4 w-4 text-primary" /> Plain Language Summary</p>
                <p className="text-sm leading-6 text-slate-200">{result.health_summary || result.summary || 'No summary generated.'}</p>
                {result.translated_summary && result.translated_summary !== result.summary && (
                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary-foreground/90">
                    {result.translated_summary}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
