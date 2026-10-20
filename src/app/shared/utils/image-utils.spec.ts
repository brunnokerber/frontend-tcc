import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compressAndResizeImage } from './image-utils';

describe('image-utils (Compressão e Redimensionamento de Fotos no Cliente)', () => {
  beforeEach(() => {
    // Mock do Image no JSDOM
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 1600;
        naturalHeight = 1200;
        width = 1600;
        height = 1200;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
          setTimeout(() => this.onload && this.onload(), 0);
        }
      },
    );

    // Mock do getContext e toBlob no HTMLCanvasElement
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    }) as any;

    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback: BlobCallback) => {
      const blob = new Blob(['mock-compressed-data'], { type: 'image/webp' });
      callback(blob);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('deve redimensionar e converter imagem respeitando largura/altura máximas e mimeType webp', async () => {
    const input = new File(['fake-raw-image-bytes'], 'pet-gigante.png', { type: 'image/png' });

    const compressed = await compressAndResizeImage(input, {
      maxWidth: 800,
      maxHeight: 800,
      mimeType: 'image/webp',
      maxSizeBytes: 256 * 1024,
    });

    expect(compressed).toBeInstanceOf(File);
    expect(compressed.name).toBe('pet-gigante.webp');
    expect(compressed.type).toBe('image/webp');
  });

  it('deve utilizar fallback para jpeg quando solicitado nas opções', async () => {
    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback: BlobCallback) => {
      const blob = new Blob(['mock-compressed-jpeg'], { type: 'image/jpeg' });
      callback(blob);
    });

    const input = new File(['fake-raw-image-bytes'], 'pet.jpg', { type: 'image/jpeg' });

    const compressed = await compressAndResizeImage(input, {
      mimeType: 'image/jpeg',
    });

    expect(compressed.name).toBe('pet.jpg');
    expect(compressed.type).toBe('image/jpeg');
  });
});
