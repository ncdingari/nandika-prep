// lib/vision.js
// Vision utilities: extract answers from worksheet images and rasterize PDFs

import { callAI } from "./ai.js";

const VISION_SYSTEM_PROMPT =
  'You are reading a worksheet completed by a 6 year old named Nandika. The worksheet contains exactly 18 numbered questions, each with four lettered choices A, B, C, D. For each question, identify which single letter she circled, checked, crossed, colored, or otherwise marked as her answer. If a question is unanswered or unclear, return null for that question and a low confidence value. Output strictly valid JSON with this exact shape and nothing else: { "answers": [ { "questionId": "<id>", "chosenLetter": "A"|"B"|"C"|"D"|null, "confidence": number between 0 and 1 } ] }. Do not include any commentary outside the JSON.';

/**
 * extractAnswersFromImages sends one or more base64 image data URLs to Claude vision
 * and returns parsed answer data.
 *
 * @param {string[]} imageDataUrls - Array of base64 data URL strings
 * @param {string[]} questionIds - Ordered list of question IDs corresponding to worksheet order
 * @returns {Promise<{ answers: Array<{ questionId: string, chosenLetter: string|null, confidence: number }> }>}
 */
export async function extractAnswersFromImages(imageDataUrls, questionIds) {
  if (!imageDataUrls || imageDataUrls.length === 0) {
    return { answers: questionIds.map((id) => ({ questionId: id, chosenLetter: null, confidence: 0 })) };
  }

  const userText =
    "The question IDs in order are: " +
    questionIds.join(", ") +
    ". Please identify the marked answer for each question ID in the image.";

  // Use the first image for the primary call.
  // If multiple pages, send them sequentially and merge results.
  if (imageDataUrls.length === 1) {
    const result = await callAI({
      task: "vision-extract",
      system: VISION_SYSTEM_PROMPT,
      user: userText,
      json: true,
      image: imageDataUrls[0],
    });

    if (!result || result.error) {
      return {
        answers: questionIds.map((id) => ({ questionId: id, chosenLetter: null, confidence: 0 })),
      };
    }

    return typeof result === "object" && result.answers ? result : { answers: [] };
  }

  // Multiple images: call per image and merge
  const allAnswers = [];
  for (const dataUrl of imageDataUrls) {
    const result = await callAI({
      task: "vision-extract",
      system: VISION_SYSTEM_PROMPT,
      user: userText,
      json: true,
      image: dataUrl,
    });
    if (result && !result.error && result.answers) {
      allAnswers.push(...result.answers);
    }
  }

  // Deduplicate by questionId, keeping the first occurrence
  const seen = new Set();
  const merged = [];
  for (const a of allAnswers) {
    if (!seen.has(a.questionId)) {
      seen.add(a.questionId);
      merged.push(a);
    }
  }

  return { answers: merged };
}

/**
 * rasterizePDF uses pdf.js (window.pdfjsLib, loaded via CDN) to rasterize
 * each page of a PDF File to a PNG data URL at approximately 200 DPI.
 *
 * @param {File} file - A PDF File object
 * @returns {Promise<string[]>} Array of PNG data URL strings, one per page
 */
export async function rasterizePDF(file) {
  if (typeof window === "undefined" || !window.pdfjsLib) {
    throw new Error("pdf.js (window.pdfjsLib) is not loaded. Please include the CDN script.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfDoc.numPages;
  const dataUrls = [];

  // 200 DPI approximation: standard PDF is 72 DPI, scale = 200/72 ~ 2.78
  const SCALE = 200 / 72;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: SCALE });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");

    await page.render({ canvasContext: ctx, viewport }).promise;

    dataUrls.push(canvas.toDataURL("image/png"));
  }

  return dataUrls;
}

/**
 * processUploadedAnswers converts image data URLs to answer JSON by calling
 * extractAnswersFromImages and returning the parsed result.
 *
 * @param {string[]} dataUrls - Array of base64 data URL strings (images or rasterized PDF pages)
 * @param {string[]} questionIds - Ordered list of question IDs
 * @returns {Promise<{ answers: Array<{ questionId: string, chosenLetter: string|null, confidence: number }> }>}
 */
export async function processUploadedAnswers(dataUrls, questionIds) {
  return extractAnswersFromImages(dataUrls, questionIds);
}
