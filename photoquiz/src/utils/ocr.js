/**
 * ocr.js — 100% offline, zero external dependencies.
 * No Tesseract, no OpenRouter, no CDN calls whatsoever.
 *
 * The app uses MANUAL text input: students type/paste their questions
 * and the parser handles all formatting normalisation.
 * Images can be uploaded for visual reference only — nothing is sent anywhere.
 */

/**
 * Convert a File to a local blob-URL for in-browser preview only.
 * @param {File} file
 * @returns {string} blob URL
 */
export function fileToBlobURL(file) {
  return URL.createObjectURL(file);
}

/**
 * Read a File as a data-URL.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}
