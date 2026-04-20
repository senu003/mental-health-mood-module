import { readFile } from "fs/promises";
import { PDFParse } from "pdf-parse";
import Tesseract from "tesseract.js";

const MIN_EXTRACTED_TEXT_LENGTH = 40;
const MAX_OCR_PAGES_FOR_PDF = 4;

const normalizeText = (text = "") => {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
};

const runOcr = async (input) => {
  const { data } = await Tesseract.recognize(input, "eng");
  return normalizeText(data?.text);
};

const extractPdfText = async (filePath) => {
  const data = await readFile(filePath);
  const parser = new PDFParse({ data });

  try {
    const textResult = await parser.getText();
    const directText = normalizeText(textResult?.text);
    if (directText.length >= MIN_EXTRACTED_TEXT_LENGTH) {
      return directText;
    }

    // Fallback for scanned PDFs: render pages and OCR page images.
    const screenshotResult = await parser.getScreenshot({
      scale: 1.8,
      first: MAX_OCR_PAGES_FOR_PDF,
      imageDataUrl: false,
      imageBuffer: true,
    });

    const pageBuffers = (screenshotResult?.pages || [])
      .map((page) => page?.data)
      .filter(Boolean);

    const ocrChunks = [];
    for (const pageBuffer of pageBuffers) {
      const pageText = await runOcr(pageBuffer);
      if (pageText) ocrChunks.push(pageText);
    }

    const ocrText = normalizeText(ocrChunks.join("\n"));
    return ocrText || directText;
  } finally {
    await parser.destroy();
  }
};

export const extractTextFromReport = async ({ filePath, mimeType }) => {
  if (!filePath) {
    throw new Error("Missing file path for OCR extraction.");
  }

  const normalizedMime = String(mimeType || "").toLowerCase();
  const isPdf = normalizedMime === "application/pdf" || filePath.toLowerCase().endsWith(".pdf");

  const extractedText = isPdf ? await extractPdfText(filePath) : await runOcr(filePath);

  if (!extractedText) {
    throw new Error("Could not extract readable text from the uploaded report. Please upload a clearer file.");
  }

  return extractedText;
};
