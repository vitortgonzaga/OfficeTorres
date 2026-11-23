/** Phones get lighter textures and geometry. Desktop keeps the full detail. */
export const isTouchDevice = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
export const TEXTURE_SCALE = isTouchDevice ? 0.6 : 1;
export const FUR_DETAIL = isTouchDevice ? 3 : 5;
export const TUFT_SCALE = isTouchDevice ? 0.5 : 1;
export const BALL_SEGMENTS: [number, number] = isTouchDevice ? [24, 16] : [40, 28];

/** Textures small enough to stay sharp are not worth shrinking. */
export const scaleFor = (w: number, h: number) => (Math.max(w, h) >= 500 ? TEXTURE_SCALE : 1);
