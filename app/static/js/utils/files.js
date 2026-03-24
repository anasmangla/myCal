export async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function isImageFile(file) {
  return Boolean(file && file.type && file.type.startsWith('image/'));
}

export async function imageDimensions(file) {
  const dataUrl = await fileToDataUrl(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height, dataUrl });
    img.onerror = reject;
    img.src = dataUrl;
  });
}
