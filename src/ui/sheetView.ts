/** How much of the screen the phone drawer covers, shared with the 3D camera. */
export const SHEET_DEFAULT_RATIO = 0.46;

export const sheetView: { ratio: number; onChange: (() => void) | null } = {
  ratio: SHEET_DEFAULT_RATIO,
  onChange: null,
};

export function setSheetRatio(ratio: number) {
  sheetView.ratio = ratio;
  sheetView.onChange?.();
}
