/** Zahl mit deutschem Dezimalkomma. */
export function fmt(n: number | string): string {
  return typeof n === "number" ? String(n).replace(".", ",") : n;
}

const CLOCK = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Uhrzeit HH:MM aus einem Epoch-Timestamp. */
export function clockTime(epochMs: number): string {
  return CLOCK.format(new Date(epochMs));
}

/** Skaliert und komprimiert eine Bilddatei zu einem JPEG-Data-URL. */
export function toJpeg(
  file: File,
  maxSize: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const s = maxSize / Math.max(width, height);
        width = Math.round(width * s);
        height = Math.round(height * s);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}
