/**
 * Personal AI Engine v3.1 - Ultra HD Optimized
 * Algoritma upscaling cerdas yang ringan untuk perangkat mobile.
 */

export async function processImageLocally(base64Image: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject("Gagal mendapatkan context canvas");
        return;
      }

      // 1. Kalkulasi Skala yang Aman untuk HP (Target 8MP / 4K)
      const targetPixels = 8000000; // 8 MP (4K Resolution)
      const currentPixels = img.width * img.height;
      const scaleFactor = Math.sqrt(targetPixels / currentPixels);
      
      const finalScale = Math.min(3, Math.max(1, scaleFactor));
      
      canvas.width = Math.round(img.width * finalScale);
      canvas.height = Math.round(img.height * finalScale);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium'; 
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // 2. Smart Smoothing & Color Boost
      enhanceColors(imageData.data);

      // 3. Unsharp Masking (Penajaman Halus)
      imageData = applyUnsharpMask(imageData, 0.5);

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png', 1.0));
    };
    img.onerror = reject;
    img.src = base64Image;
  });
}

function applyGaussianBlur(imageData: ImageData): ImageData {
  const kernel = [1/16, 2/16, 1/16, 2/16, 4/16, 2/16, 1/16, 2/16, 1/16];
  return applyConvolution(imageData, kernel);
}

function applyUnsharpMask(imageData: ImageData, amount: number): ImageData {
  const blurred = applyGaussianBlur(imageData);
  const src = imageData.data;
  const blr = blurred.data;
  const output = new ImageData(imageData.width, imageData.height);
  const dst = output.data;

  for (let i = 0; i < src.length; i += 4) {
    dst[i] = Math.min(255, Math.max(0, src[i] + (src[i] - blr[i]) * amount));
    dst[i+1] = Math.min(255, Math.max(0, src[i+1] + (src[i+1] - blr[i+1]) * amount));
    dst[i+2] = Math.min(255, Math.max(0, src[i+2] + (src[i+2] - blr[i+2]) * amount));
    dst[i+3] = src[i+3];
  }
  return output;
}

function enhanceColors(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
    data[i] = Math.min(255, gray + 1.1 * (r - gray));
    data[i+1] = Math.min(255, gray + 1.1 * (g - gray));
    data[i+2] = Math.min(255, gray + 1.1 * (b - gray));
    data[i] = (data[i] - 128) * 1.05 + 128 + 5;
    data[i+1] = (data[i+1] - 128) * 1.05 + 128 + 5;
    data[i+2] = (data[i+2] - 128) * 1.05 + 128 + 5;
  }
}

function applyConvolution(imageData: ImageData, kernel: number[]): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const src = imageData.data;
  const output = new ImageData(width, height);
  const dst = output.data;
  const side = Math.round(Math.sqrt(kernel.length));
  const halfSide = Math.floor(side / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dstOff = (y * width + x) * 4;
      let r = 0, g = 0, b = 0;
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = Math.min(height - 1, Math.max(0, y + cy - halfSide));
          const scx = Math.min(width - 1, Math.max(0, x + cx - halfSide));
          const srcOff = (scy * width + scx) * 4;
          const wt = kernel[cy * side + cx];
          r += src[srcOff] * wt;
          g += src[srcOff + 1] * wt;
          b += src[srcOff + 2] * wt;
        }
      }
      dst[dstOff] = r;
      dst[dstOff + 1] = g;
      dst[dstOff + 2] = b;
      dst[dstOff + 3] = src[dstOff + 3];
    }
  }
  return output;
        }
