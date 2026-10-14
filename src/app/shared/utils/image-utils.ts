/**
 * Utilitário de processamento, redimensionamento e compressão de imagens no cliente (Client-Side Canvas).
 * Garante que qualquer foto selecionada (mesmo de câmeras de alta resolução de 10 MB+)
 * seja comprimida e redimensionada para respeitar com rigor o limite do Supabase Storage.
 */

export interface ImageCompressionOptions {
  maxSizeBytes?: number; // Padrão: 256 KB (262.144 bytes)
  maxWidth?: number; // Padrão: 800 px
  maxHeight?: number; // Padrão: 800 px
  mimeType?: 'image/webp' | 'image/jpeg';
  initialQuality?: number;
}

/**
 * Converte um Canvas HTML para Blob de forma assíncrona.
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback para JPEG caso o navegador não suporte WebP no canvas
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) {
                resolve(jpegBlob);
              } else {
                reject(new Error('Falha ao converter canvas para Blob.'));
              }
            },
            'image/jpeg',
            quality
          );
        }
      },
      format,
      quality
    );
  });
}

/**
 * Carrega um objeto File em um elemento HTMLImageElement.
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler o arquivo de imagem fornecido.'));
    };

    img.src = url;
  });
}

/**
 * Redimensiona e comprime uma imagem no navegador utilizando a API Canvas.
 * Realiza compressão progressiva de qualidade e redução dimensional iterativa
 * até atingir o tamanho máximo estipulado.
 */
export async function compressAndResizeImage(
  file: File,
  options?: ImageCompressionOptions
): Promise<File> {
  const maxBytes = options?.maxSizeBytes ?? 256 * 1024; // 256 KB
  const maxW = options?.maxWidth ?? 800;
  const maxH = options?.maxHeight ?? 800;
  const mimeType = options?.mimeType ?? 'image/webp';
  let quality = options?.initialQuality ?? 0.85;

  // Carrega a imagem original
  const img = await loadImageFromFile(file);
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  // Cálculo da proporção para não exceder maxWidth e maxHeight
  if (width > maxW || height > maxH) {
    const ratio = Math.min(maxW / width, maxH / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Cria o canvas e desenha a imagem redimensionada
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Falha ao inicializar o contexto 2D do Canvas.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, mimeType, quality);

  // Passo 1: Redução progressiva de qualidade de compressão
  while (blob.size > maxBytes && quality > 0.35) {
    quality -= 0.12;
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  // Passo 2: Se ainda ultrapassar o limite, reduz as dimensões físicas progressivamente
  let currentWidth = width;
  let currentHeight = height;

  while (blob.size > maxBytes && (currentWidth > 300 || currentHeight > 300)) {
    currentWidth = Math.round(currentWidth * 0.85);
    currentHeight = Math.round(currentHeight * 0.85);

    const downscaledCanvas = document.createElement('canvas');
    downscaledCanvas.width = currentWidth;
    downscaledCanvas.height = currentHeight;

    const dCtx = downscaledCanvas.getContext('2d');
    if (dCtx) {
      dCtx.imageSmoothingEnabled = true;
      dCtx.imageSmoothingQuality = 'high';
      dCtx.drawImage(canvas, 0, 0, currentWidth, currentHeight);
      blob = await canvasToBlob(downscaledCanvas, mimeType, 0.8);
    }
  }

  // Cria um novo arquivo File com a extensão correspondente
  const originalBaseName = file.name.replace(/\.[^/.]+$/, '');
  const extension = mimeType === 'image/webp' ? '.webp' : '.jpg';
  const newFileName = `${originalBaseName}${extension}`;

  return new File([blob], newFileName, {
    type: blob.type || mimeType,
    lastModified: Date.now(),
  });
}
