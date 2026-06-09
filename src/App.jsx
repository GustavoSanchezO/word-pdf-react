import React, { useMemo, useState } from "react";
import mammoth from "mammoth";
import jsPDF from "jspdf";
import { Upload, FileText, Download, Loader2, AlertCircle, Trash2 } from "lucide-react";

const PAGE_MARGIN = 18;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const FONT_SIZE = 12;
const LINE_HEIGHT = 7;

function wrapText(doc, text, maxWidth) {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = doc.getTextWidth(testLine);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

export default function App() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("waiting");
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const canConvert = useMemo(() => Boolean(text.trim()), [text]);

  const resetDownload = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl("");
    }
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    resetDownload();
    setError("");
    setStatus("reading");
    setFile(selected);
    setFileName(selected.name);
    setText("");

    const ext = selected.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["txt", "docx"];
    
    if (!validExtensions.includes(ext)) {
      console.error("no es un archivo valido");
      setStatus("error");
      setError("Solo se aceptan archivos .txt o .docx");
      console.info("Solo se aceptan archivos .txt o .docs")
      return;
    }

    try {
      const arrayBuffer = await selected.arrayBuffer();
      let extracted = "";

      if (ext === "docx") {
        const result = await mammoth.extractRawText({ arrayBuffer });
        extracted = result.value || "";
      } else if (ext === "txt") {
        const decoder = new TextDecoder();
        extracted = decoder.decode(arrayBuffer);
      }

      if (!extracted.trim()) {
        setStatus("error");
        setError("No se pudo extraer texto del archivo. Verifica que sea válido.");
        return;
      }

      setText(extracted);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError("Ocurrió un problema al leer el archivo. Verifica que sea válido.");
    }
  };

  const handleConvert = async () => {
    if (!canConvert) return;

    try {
      setStatus("converting");
      setError("");
      resetDownload();

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FONT_SIZE);

      const maxWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
      const lines = wrapText(doc, text, maxWidth);

      let y = PAGE_MARGIN;
      const bottomLimit = PAGE_HEIGHT - PAGE_MARGIN;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Documento convertido desde Word", PAGE_MARGIN, y);
      y += 10;

      doc.setFontSize(FONT_SIZE);
      doc.setFont("helvetica", "normal");
      console.log("Convertido correctamente")

      for (const line of lines) {
        if (y > bottomLimit) {
          doc.addPage();
          y = PAGE_MARGIN;
        }

        if (line === "") {
          y += LINE_HEIGHT;
          continue;
        }

        doc.text(line, PAGE_MARGIN, y);
        y += LINE_HEIGHT;
      }

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError("No se pudo generar el PDF. Intenta nuevamente.");
      console.err("No se pudo generar el pdf", err)
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${fileName.replace(/\.[^.]+$/, "") || "archivo"}.pdf`;
    a.click();
  };

  const clearAll = () => {
    setFile(null);
    setFileName("");
    setText("");
    setStatus("waiting");
    setError("");
    resetDownload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10">
        <div className="grid w-full gap-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Word a PDF</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Convierte un .docx a PDF desde la web</h1>
              <p className="mt-3 max-w-xl text-slate-300">
                Sube tu archivo Word, extrae el texto y descárgalo como PDF sin salir del navegador.
              </p>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 px-6 py-10 text-center transition hover:border-slate-500 hover:bg-slate-950">
              <Upload className="mb-3 h-10 w-10 text-slate-300" />
              <span className="text-lg font-medium">Arrastra tu .docx aquí o haz clic para elegirlo</span>
              <span className="mt-2 text-sm text-slate-400">Solo archivos .docx por ahora</span>
              <input type="file" accept=".docx" className="hidden" onChange={handleFileChange} />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleConvert}
                disabled={!canConvert || status === "converting"}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "converting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Generar PDF
              </button>

              <button
                onClick={clearAll}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                <Trash2 className="h-4 w-4" />
                Limpiar
              </button>
            </div>

            {fileName && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-1 h-5 w-5 text-slate-300" />
                  <div>
                    <p className="font-medium">{fileName}</p>
                    <p className="text-sm text-slate-400">{text ? "Texto listo para convertir" : "Esperando extracción del contenido"}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-900/50 bg-red-950/40 p-4 text-red-200">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {downloadUrl && (
              <div className="flex flex-wrap gap-3 rounded-2xl border border-emerald-900/50 bg-emerald-950/30 p-4">
                <p className="w-full text-emerald-100">PDF generado correctamente.</p>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition hover:opacity-90"
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </button>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Vista previa del texto extraído</h2>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                {status === "waiting" && "Listo"}
                {status === "reading" && "Leyendo"}
                {status === "ready" && "Preparado"}
                {status === "converting" && "Convirtiendo"}
                {status === "done" && "Hecho"}
                {status === "error" && "Error"}
              </span>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-slate-800 bg-slate-900 p-4">
              {text ? (
                <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">
                  {text}
                </pre>
              ) : (
                <div className="flex min-h-[320px] items-center justify-center text-center text-slate-500">
                  <p>Tu documento aparecerá aquí después de subirlo.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
