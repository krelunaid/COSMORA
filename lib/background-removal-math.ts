// U²-Net's portable 320px model: ImageNet-normalized planar RGB.
export function prepareCutoutInput(rgba: Uint8ClampedArray) {
  const count = rgba.length / 4;
  let maximum = 1;
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < 3; c++) maximum = Math.max(maximum, rgba[i * 4 + c]);
  }
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  const input = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < 3; c++)
      input[c * count + i] = (rgba[i * 4 + c] / maximum - mean[c]) / std[c];
  }
  return input;
}

export function cutoutMask(values: Float32Array) {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) throw new Error('Invalid mask');
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (max - min < 1e-6) throw new Error('No subject detected');
  const rgba = new Uint8ClampedArray(values.length * 4);
  for (let i = 0; i < values.length; i++) {
    rgba[i * 4 + 3] = Math.round((255 * (values[i] - min)) / (max - min));
  }
  return rgba;
}
