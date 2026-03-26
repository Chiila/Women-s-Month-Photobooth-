/** Base export width in CSS pixels; multiplied by `scale` for sharp exports. */
const STRIP_WIDTH = 900;

/** PNG template (`/template.png`) uses five vertical slots. */
export const TEMPLATE_SHOT_COUNT = 5 as const;

/** @deprecated Same as `TEMPLATE_SHOT_COUNT` — template-only flow. */
export const STRIP_SHOT_COUNT = TEMPLATE_SHOT_COUNT;

/** Native pixel size of `template.png` (for UI aspect ratio). */
export const TEMPLATE_NATURAL_WIDTH = 2210;
export const TEMPLATE_NATURAL_HEIGHT = 6250;

/**
 * Photo windows in normalized 0–1 coordinates relative to the template bitmap.
 * Order is top → bottom.
 */
const TEMPLATE_SLOT_X_NORM = 0.03;
const TEMPLATE_SLOT_W_NORM = 0.94;
const TEMPLATE_SLOT_TOP_NORM = 0.105;
const TEMPLATE_SLOT_H_NORM = 0.131;
const TEMPLATE_SLOT_GAP_NORM = 0.009;

export const TEMPLATE_PHOTO_SLOTS_NORM: readonly {
  x: number;
  y: number;
  w: number;
  h: number;
}[] = [
  {
    x: TEMPLATE_SLOT_X_NORM,
    y: TEMPLATE_SLOT_TOP_NORM,
    w: TEMPLATE_SLOT_W_NORM,
    h: TEMPLATE_SLOT_H_NORM,
  },
  {
    x: TEMPLATE_SLOT_X_NORM,
    y:
      TEMPLATE_SLOT_TOP_NORM +
      1 * (TEMPLATE_SLOT_H_NORM + TEMPLATE_SLOT_GAP_NORM),
    w: TEMPLATE_SLOT_W_NORM,
    h: TEMPLATE_SLOT_H_NORM,
  },
  {
    x: TEMPLATE_SLOT_X_NORM,
    y:
      TEMPLATE_SLOT_TOP_NORM +
      2 * (TEMPLATE_SLOT_H_NORM + TEMPLATE_SLOT_GAP_NORM),
    w: TEMPLATE_SLOT_W_NORM,
    h: TEMPLATE_SLOT_H_NORM,
  },
  {
    x: TEMPLATE_SLOT_X_NORM,
    y:
      TEMPLATE_SLOT_TOP_NORM +
      3 * (TEMPLATE_SLOT_H_NORM + TEMPLATE_SLOT_GAP_NORM),
    w: TEMPLATE_SLOT_W_NORM,
    h: TEMPLATE_SLOT_H_NORM,
  },
  {
    x: TEMPLATE_SLOT_X_NORM,
    y:
      TEMPLATE_SLOT_TOP_NORM +
      4 * (TEMPLATE_SLOT_H_NORM + TEMPLATE_SLOT_GAP_NORM),
    w: TEMPLATE_SLOT_W_NORM,
    h: TEMPLATE_SLOT_H_NORM,
  },
] as const;

/**
 * Pixel width / height of one photo slot on `template.png` (landscape).
 * Use for the live camera preview so framing matches the exported strip crop.
 */
const _slot0 = TEMPLATE_PHOTO_SLOTS_NORM[0]!;
export const TEMPLATE_SLOT_PIXEL_WIDTH = Math.round(
  _slot0.w * TEMPLATE_NATURAL_WIDTH,
);
export const TEMPLATE_SLOT_PIXEL_HEIGHT = Math.round(
  _slot0.h * TEMPLATE_NATURAL_HEIGHT,
);

export const TEMPLATE_PATH = "/template.png";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function drawImageCoverInRoundedRect(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number,
  cornerRadius: number,
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const targetRatio = dWidth / dHeight;
  const srcRatio = iw / ih;
  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;
  if (srcRatio > targetRatio) {
    sw = Math.round(ih * targetRatio);
    sx = Math.round((iw - sw) / 2);
  } else {
    sh = Math.round(iw / targetRatio);
    sy = Math.round((ih - sh) / 2);
  }

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(dx, dy, dWidth, dHeight, cornerRadius);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dWidth, dHeight);
  ctx.restore();
}

/**
 * Merges five webcam shots onto `/template.png` (full width, native aspect ratio).
 */
export async function composeFilmStrip(
  shots: string[],
  scale = 2,
): Promise<{ dataUrl: string; blob: Blob }> {
  if (shots.length !== TEMPLATE_SHOT_COUNT) {
    throw new Error(`composeFilmStrip needs exactly ${TEMPLATE_SHOT_COUNT} photos`);
  }
  if (TEMPLATE_PHOTO_SLOTS_NORM.length !== TEMPLATE_SHOT_COUNT) {
    throw new Error(
      `TEMPLATE_PHOTO_SLOTS_NORM must define ${TEMPLATE_SHOT_COUNT} slots`,
    );
  }

  const w = Math.round(STRIP_WIDTH * scale);

  const [templateImg, ...photoImgs] = await Promise.all([
    loadImage(TEMPLATE_PATH),
    ...shots.map(loadImage),
  ]);

  const tw = templateImg.naturalWidth;
  const th = templateImg.naturalHeight;
  const stripH = Math.round(w * (th / tw));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = stripH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  ctx.drawImage(templateImg, 0, 0, w, stripH);

  for (let i = 0; i < TEMPLATE_SHOT_COUNT; i++) {
    const slot = TEMPLATE_PHOTO_SLOTS_NORM[i]!;
    const img = photoImgs[i]!;
    const dx = Math.round(slot.x * w);
    const dy = Math.round(slot.y * stripH);
    const dWidth = Math.round(slot.w * w);
    const dHeight = Math.round(slot.h * stripH);
    const cornerRadius = Math.max(4, Math.min(dWidth, dHeight) * 0.035);
    drawImageCoverInRoundedRect(ctx, img, dx, dy, dWidth, dHeight, cornerRadius);
  }

  const dataUrl = canvas.toDataURL("image/png", 1);
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
      1,
    );
  });

  return { dataUrl, blob };
}
