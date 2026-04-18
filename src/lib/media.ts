/**
 * Captures a thumbnail from a video file at a given time (default 1s).
 * Returns a JPEG Blob plus the detected width/height/duration.
 */
export const captureVideoThumbnail = (
  file: File,
  atSeconds = 1,
): Promise<{
  blob: Blob;
  width: number;
  height: number;
  duration: number;
}> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      const t = Math.min(Math.max(atSeconds, 0), Math.max(video.duration - 0.1, 0));
      video.currentTime = t || 0;
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = video.videoWidth;
        const h = video.videoHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) return reject(new Error("Falha ao gerar thumbnail"));
            resolve({ blob, width: w, height: h, duration: video.duration });
          },
          "image/jpeg",
          0.85,
        );
      } catch (e) {
        cleanup();
        reject(e);
      }
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Não foi possível ler o vídeo"));
    };
  });
};

/**
 * Reads an image File and returns its dimensions.
 */
export const readImageDimensions = (
  file: File,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const r = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(r);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Imagem inválida"));
    };
    img.src = url;
  });
};
