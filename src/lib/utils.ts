import { createNoise2D } from "simplex-noise";
import * as THREE from "three";

export const blendColor = (
  color1: string,
  color2: string,
  t: number,
): string => {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.lerp(c2, t).getStyle();
};

export const randomColor = (): string => {
  const colors = [
    "deepskyblue",
    "limegreen",
    "orange",
    "violet",
    "red",
    "yellow",
    "aqua",
    "pink",
    "white",
    "gold",
    "saddlebrown",
    "slateblue",
    "crimson",
    "teal",
    "coral",
    "indigo",
    "khaki",
    "plum",
    "salmon",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const seededRandom = (seed: number): (() => number) => {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
};

export const randomRadius = (): number => {
  const min = 0.3;
  const max = 8;
  const alpha = 3.2;
  return Math.pow(
    Math.random() * (Math.pow(max, 1 - alpha) - Math.pow(min, 1 - alpha)) +
      Math.pow(min, 1 - alpha),
    1 / (1 - alpha),
  );
};

export const generateBumpMap = (): THREE.Texture | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  canvas.width = 512;
  canvas.height = 512;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 2;
    ctx.fillRect(x, y, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

export const generateColorMap = (
  seed: number,
  baseColor: string,
  altColor: string,
): THREE.CanvasTexture => {
  const size = 128;
  const noise2D = createNoise2D(seededRandom(seed));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const white = document.createElement("canvas");
    white.width = white.height = 1;
    const wctx = white.getContext("2d");
    if (wctx) {
      wctx.fillStyle = "white";
      wctx.fillRect(0, 0, 1, 1);
    }
    return new THREE.CanvasTexture(white);
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size - 0.5;
      const ny = y / size - 0.5;
      let n = 0;
      let amp = 1;
      let freq = 1;
      for (let o = 0; o < 5; o++) {
        n += amp * noise2D(nx * freq * 4, ny * freq * 4);
        amp *= 0.5;
        freq *= 2;
      }
      n = n / 2.5;
      let t = (n + 1) * 0.5;
      const band = Math.abs(Math.sin(ny * Math.PI * 6 + seed));
      t = t * 0.7 + band * 0.3;
      const color = blendColor(baseColor, altColor, t);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return new THREE.CanvasTexture(canvas);
};

export const roundVec3 = (
  v: [number, number, number],
): [number, number, number] =>
  v.map((n) => Math.round(n * 100) / 100) as [number, number, number];

export const roundArray = (arr: number[]): number[] =>
  arr.map((n) => Math.round(n * 100) / 100);

export const VEC3_EPSILON = 0.001;

export const areVec3sEqual = (
  a: Readonly<[number, number, number]> | undefined,
  b: Readonly<[number, number, number]>,
): boolean => {
  if (!a) {
    return false;
  }

  for (let i = 0; i < 3; i++) {
    const valA = a[i];
    const valB = b[i];

    if (Number.isNaN(valA) && Number.isNaN(valB)) {
      continue;
    }
    if (Number.isNaN(valA) || Number.isNaN(valB)) {
      return false;
    }
    if (Math.abs(valA - valB) >= VEC3_EPSILON) {
      return false;
    }
  }
  return true;
};

export const downscaleImage = (
  dataUrl: string,
  newWidth: number,
  newHeight: number,
): Promise<string> =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      // Cannot downscale in non-browser environment
      return resolve(dataUrl);
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Failed to get 2D context for downscaling"));
      }
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = dataUrl;
  });
