import type { PhotoItem } from '~/composables/usePhotoStore';

// A4 landscape at 300 DPI
const DPI = 300;
const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;
const A4_WIDTH_PX = Math.round((A4_WIDTH_MM / 25.4) * DPI); // 3508
const A4_HEIGHT_PX = Math.round((A4_HEIGHT_MM / 25.4) * DPI); // 2480

const COLS = 4;
const ROWS = 2;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const cellRatio = dw / dh;

  let sx: number, sy: number, sw: number, sh: number;

  if (imgRatio > cellRatio) {
    // Image is wider than cell — crop sides
    sh = img.naturalHeight;
    sw = sh * cellRatio;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  }
  else {
    // Image is taller than cell — crop top/bottom
    sw = img.naturalWidth;
    sh = sw / cellRatio;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

export function useExportPdf() {
  const isExporting = ref(false);

  async function exportToPdf(
    photos: PhotoItem[],
    gap: number,
    filename = 'fanzine.pdf',
  ): Promise<void> {
    if (photos.length === 0) return;

    isExporting.value = true;

    try {
      // Scale gap from CSS pixels to print pixels (gap is relative to a ~900px wide preview)
      const gapPx = Math.round((gap / 900) * A4_WIDTH_PX);

      const totalGapX = gapPx * (COLS - 1);
      const totalGapY = gapPx * (ROWS - 1);
      const cellW = Math.floor((A4_WIDTH_PX - totalGapX) / COLS);
      const cellH = Math.floor((A4_HEIGHT_PX - totalGapY) / ROWS);

      // Create offscreen canvas at exact print dimensions
      const canvas = document.createElement('canvas');
      canvas.width = A4_WIDTH_PX;
      canvas.height = A4_HEIGHT_PX;
      const ctx = canvas.getContext('2d')!;

      // Fill background black (visible in gaps)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

      // Load all images in parallel
      const images = await Promise.all(
        photos.map(photo => loadImage(photo.url)),
      );

      // Draw each image into its grid cell with object-fit: cover behavior
      for (let i = 0; i < images.length; i++) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = col * (cellW + gapPx);
        const y = row * (cellH + gapPx);

        drawImageCover(ctx, images[i]!, x, y, cellW, cellH);
      }

      // Generate PDF
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
      pdf.save(filename);
    }
    finally {
      isExporting.value = false;
    }
  }

  return {
    exportToPdf,
    isExporting,
  };
}
