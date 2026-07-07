export const DEFAULT_PROTEIN = 25; // g protein per 100g tuna when not specified

export function per100g(price, drained) {
  return price / (drained / 100);
}
export function proteinGrams(drained, proteinPer100) {
  return drained * ((proteinPer100 || DEFAULT_PROTEIN) / 100);
}
export function perProtein(price, drained, proteinPer100) {
  return price / proteinGrams(drained, proteinPer100);
}
export function drainRatio(drained, labelWeight) {
  return labelWeight ? drained / labelWeight : null;
}
