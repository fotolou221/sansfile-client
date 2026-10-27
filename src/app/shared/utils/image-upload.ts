/** Formats acceptés par le serveur (vérifiés aussi sur le contenu du fichier). */
const SERVER_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

/** Message affiché quand la photo ne peut être ni lue ni envoyée telle quelle. */
export const UNSUPPORTED_PHOTO_MESSAGE =
  "Ce format de photo n'est pas pris en charge. Choisissez une photo JPEG ou PNG.";

/**
 * Prépare une photo pour l'envoi : lue par le navigateur (y compris le HEIC des iPhone), réduite à {@code maxSide}
 * pixels sur son plus grand côté, puis réencodée en JPEG (bien plus légère). Si le navigateur ne sait pas la lire,
 * elle part telle quelle quand le serveur accepte déjà son format ; sinon, erreur avec un message clair.
 */
export async function prepareImageForUpload(
  file: File,
  maxSide = 1600,
  quality = 0.85,
): Promise<File> {
  try {
    const source = await decode(file);
    const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas');
    // Fond blanc : un PNG transparent ne devient pas noir en JPEG
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(source.image, 0, 0, width, height);
    source.release();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) throw new Error('encodage');
    const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    if (SERVER_FORMATS.includes(file.type)) return file;
    throw new Error(UNSUPPORTED_PHOTO_MESSAGE);
  }
}

interface DecodedImage {
  readonly image: CanvasImageSource;
  readonly width: number;
  readonly height: number;
  release(): void;
}

/** Image décodée, orientation de l'appareil photo respectée. */
async function decode(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Safari plus ancien : on passe par une balise image
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return {
      image: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}
