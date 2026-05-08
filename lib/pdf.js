// lib/pdf.js (named pdfLib to avoid conflict with pdf.js CDN)
// Worksheet PDF generation using jsPDF + html2canvas (both loaded via CDN)

/**
 * generateWorksheetPDF creates a printable black-and-white PDF worksheet.
 *
 * Requires window.jspdf.jsPDF and window.html2canvas to be loaded via CDN.
 *
 * @param {Array<{id: string, number: number, svgPrompt?: string, text?: string, skill?: string}>} questions
 * @param {number} day - Day number (1-60)
 * @param {string} date - Display date string (e.g. "June 1, 2025")
 * @returns {Promise<object>} jsPDF instance (call .save("filename.pdf") to download)
 */
export async function generateWorksheetPDF(questions, day, date) {
  if (typeof window === "undefined") {
    throw new Error("generateWorksheetPDF requires a browser environment.");
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error("jsPDF (window.jspdf.jsPDF) is not loaded. Please include the CDN script.");
  }
  if (!window.html2canvas) {
    throw new Error("html2canvas (window.html2canvas) is not loaded. Please include the CDN script.");
  }

  const { jsPDF } = window.jspdf;

  // Build a hidden printable div
  const container = document.createElement("div");
  container.id = "__nandikaPrep_pdfContainer";
  container.style.cssText = [
    "position: fixed",
    "left: -9999px",
    "top: 0",
    "width: 794px",
    "background: #ffffff",
    "color: #000000",
    "font-family: Arial, Helvetica, sans-serif",
    "font-size: 14px",
    "padding: 40px 50px 40px 50px",
    "box-sizing: border-box",
  ].join("; ");

  // Header
  const header = document.createElement("div");
  header.style.cssText = "text-align: center; margin-bottom: 24px; border-bottom: 2px solid #000; padding-bottom: 12px;";
  header.innerHTML =
    "<h1 style='margin:0; font-size:22px; font-weight:bold;'>Nandika's Worksheet - Day " +
    day +
    "</h1><p style='margin:4px 0 0 0; font-size:14px;'>" +
    date +
    "</p>";
  container.appendChild(header);

  // Questions
  for (const q of questions) {
    const qBlock = document.createElement("div");
    qBlock.style.cssText =
      "margin-bottom: 28px; page-break-inside: avoid;";

    const qNum = document.createElement("div");
    qNum.style.cssText = "font-weight: bold; font-size: 15px; margin-bottom: 8px;";
    qNum.textContent = "Question " + (q.number ?? q.id);
    qBlock.appendChild(qNum);

    // SVG prompt (if available)
    if (q.svgPrompt) {
      const svgWrap = document.createElement("div");
      svgWrap.style.cssText = "margin-bottom: 10px; max-width: 300px;";
      svgWrap.innerHTML = q.svgPrompt;
      qBlock.appendChild(svgWrap);
    } else if (q.text) {
      const textEl = document.createElement("div");
      textEl.style.cssText = "margin-bottom: 10px; font-size: 14px; line-height: 1.5;";
      textEl.textContent = q.text;
      qBlock.appendChild(textEl);
    }

    // Answer bubbles: A B C D
    const bubblesRow = document.createElement("div");
    bubblesRow.style.cssText = "display: flex; gap: 24px; align-items: center; margin-top: 6px;";

    for (const letter of ["A", "B", "C", "D"]) {
      const bubble = document.createElement("div");
      bubble.style.cssText = [
        "display: inline-flex",
        "align-items: center",
        "gap: 6px",
        "font-size: 14px",
      ].join("; ");

      const circle = document.createElement("div");
      circle.style.cssText = [
        "width: 26px",
        "height: 26px",
        "border-radius: 50%",
        "border: 2px solid #000",
        "display: flex",
        "align-items: center",
        "justify-content: center",
        "font-weight: bold",
        "font-size: 13px",
      ].join("; ");
      circle.textContent = letter;

      bubble.appendChild(circle);
      bubblesRow.appendChild(bubble);
    }

    qBlock.appendChild(bubblesRow);
    container.appendChild(qBlock);
  }

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText =
    "margin-top: 32px; border-top: 1px solid #000; padding-top: 10px; text-align: center; font-size: 12px; color: #444;";
  footer.textContent =
    "Keep going, Nandika! Every question makes your brain stronger. You are doing amazing!";
  container.appendChild(footer);

  document.body.appendChild(container);

  let doc;
  try {
    const canvas = await window.html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pageWidth = 210; // A4 mm
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    let yOffset = 0;
    let remaining = imgHeight;

    while (remaining > 0) {
      if (yOffset > 0) doc.addPage();
      const sliceHeight = Math.min(pageHeight, remaining);
      doc.addImage(imgData, "PNG", 0, -yOffset, imgWidth, imgHeight);
      yOffset += pageHeight;
      remaining -= sliceHeight;
    }
  } finally {
    document.body.removeChild(container);
  }

  return doc;
}
