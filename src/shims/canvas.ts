/**
 * Minimal shim for `canvas` in browser-oriented builds.
 *
 * `pdfjs-dist` conditionally references the Node `canvas` package for SSR/node
 * execution paths, but this app only renders PDFs in the browser.
 */

export class DOMMatrix {
  constructor(public readonly values: number[] = []) {}
}

export function createCanvas() {
  throw new Error("canvas shim should not be used at runtime in the browser");
}

export function createImageData() {
  throw new Error("canvas shim should not be used at runtime in the browser");
}

export async function loadImage() {
  throw new Error("canvas shim should not be used at runtime in the browser");
}
