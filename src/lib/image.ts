/** Read a file into a data URL. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode the image."));
    image.src = src;
  });
}

/**
 * Downscale an image (given as a data URL) into a compact PNG data URL. The
 * original is returned if the image cannot be decoded or resized.
 */
export async function resizeDataUrl(
  dataUrl: string,
  maxDimension = 640,
): Promise<string> {
  try {
    const image = await loadImage(dataUrl);
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return dataUrl;

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

/**
 * Turn an uploaded image into a compact PNG data URL. The image is downscaled so
 * it stays sharp but small enough to cache offline and send to the server.
 */
export async function imageFileToDataUrl(
  file: File,
  maxDimension = 640,
): Promise<string> {
  return resizeDataUrl(await readAsDataUrl(file), maxDimension);
}

/**
 * Downscale a photo into a JPEG data URL. Receipts are photographed, and JPEG
 * keeps them far smaller than PNG at text-legible sizes. The scale and quality
 * are stepped down until the result fits within `maxChars`, so an upload never
 * gets rejected by the server's size limit.
 */
export async function imageFileToJpegDataUrl(
  file: File,
  maxDimension = 1280,
  maxChars = 1_800_000,
): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  let image: HTMLImageElement;
  try {
    image = await loadImage(dataUrl);
  } catch {
    return dataUrl;
  }

  const attempts: Array<{ scale: number; quality: number }> = [
    { scale: 1, quality: 0.82 },
    { scale: 0.8, quality: 0.7 },
    { scale: 0.6, quality: 0.6 },
    { scale: 0.45, quality: 0.5 },
  ];

  // Never upscale; only shrink images larger than the target dimension.
  const baseScale = Math.min(1, maxDimension / Math.max(image.width, image.height));

  let smallest = dataUrl;
  for (const { scale, quality } of attempts) {
    const finalScale = baseScale * scale;
    const width = Math.max(1, Math.round(image.width * finalScale));
    const height = Math.max(1, Math.round(image.height * finalScale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return smallest;

    // JPEG has no alpha channel; paint white so transparent areas stay white.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const result = canvas.toDataURL("image/jpeg", quality);
    if (result.length < smallest.length) smallest = result;
    if (result.length <= maxChars) return result;
  }

  return smallest;
}
