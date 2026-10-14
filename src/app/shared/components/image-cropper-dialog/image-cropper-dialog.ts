import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ImageCropperDialogData {
  imageFile?: File;
  imageUrl?: string;
  title?: string;
  outputSize?: number;
  maxFileSizeKB?: number;
}

export interface ImageCropperResult {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-image-cropper-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './image-cropper-dialog.html',
  styleUrls: ['./image-cropper-dialog.scss'],
})
export class ImageCropperDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  public data: ImageCropperDialogData = inject(MAT_DIALOG_DATA);
  public dialogRef = inject(MatDialogRef<ImageCropperDialogComponent, ImageCropperResult | null>);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('cropCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // Dimensões do viewport de enquadramento
  public readonly canvasSize = 320;
  public readonly outputSize = this.data.outputSize || 600;
  public readonly maxFileSizeKB = this.data.maxFileSizeKB || 256;

  // Estados reativos (Signals)
  public isLoading = signal<boolean>(true);
  public isExporting = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);
  public zoom = signal<number>(1.0);
  public rotation = signal<number>(0);

  // Variáveis internas de transformação e arrasto
  private loadedImage: HTMLImageElement | null = null;
  private imageWidth = 0;
  private imageHeight = 0;
  private baseScale = 1.0;
  private offsetX = 0;
  private offsetY = 0;

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private initialOffsetX = 0;
  private initialOffsetY = 0;

  private localCreatedUrl: string | null = null;

  ngOnInit(): void {
    // Validação inicial dos parâmetros recebidos
    if (!this.data.imageFile && !this.data.imageUrl) {
      this.errorMessage.set('Nenhum arquivo ou endereço de imagem foi fornecido.');
      this.isLoading.set(false);
    }
  }

  ngAfterViewInit(): void {
    if (this.data.imageFile || this.data.imageUrl) {
      this.carregarImagem();
    }
  }

  ngOnDestroy(): void {
    if (this.localCreatedUrl) {
      URL.revokeObjectURL(this.localCreatedUrl);
      this.localCreatedUrl = null;
    }
  }

  private carregarImagem(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      this.loadedImage = img;
      this.imageWidth = img.naturalWidth || img.width;
      this.imageHeight = img.naturalHeight || img.height;

      this.calcularEscalaBase();
      this.resetarTransformacoes();
      this.isLoading.set(false);
      this.cdr.detectChanges();
      this.render();
    };

    img.onerror = () => {
      this.isLoading.set(false);
      this.errorMessage.set(
        'Falha ao carregar a imagem selecionada. Verifique se o formato é válido ou selecione outro arquivo.'
      );
      this.cdr.detectChanges();
    };

    if (this.data.imageFile) {
      this.localCreatedUrl = URL.createObjectURL(this.data.imageFile);
      img.src = this.localCreatedUrl;
    } else if (this.data.imageUrl) {
      img.src = this.data.imageUrl;
    }
  }

  private isSideways(): boolean {
    return this.rotation() % 180 !== 0;
  }

  private getEffectiveDimensions(): { width: number; height: number } {
    if (this.isSideways()) {
      return { width: this.imageHeight, height: this.imageWidth };
    }
    return { width: this.imageWidth, height: this.imageHeight };
  }

  private calcularEscalaBase(): void {
    const dims = this.getEffectiveDimensions();
    // A escala base garante que a imagem cubra integralmente a janela de enquadramento
    this.baseScale = Math.max(this.canvasSize / dims.width, this.canvasSize / dims.height);
  }

  private clampOffsets(): void {
    const dims = this.getEffectiveDimensions();
    const currentScale = this.baseScale * this.zoom();

    const maxPanX = Math.max(0, (dims.width * currentScale - this.canvasSize) / 2);
    const maxPanY = Math.max(0, (dims.height * currentScale - this.canvasSize) / 2);

    this.offsetX = Math.max(-maxPanX, Math.min(maxPanX, this.offsetX));
    this.offsetY = Math.max(-maxPanY, Math.min(maxPanY, this.offsetY));
  }

  public render(): void {
    if (!this.loadedImage || !this.canvasRef) {
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    this.clampOffsets();
    const currentScale = this.baseScale * this.zoom();

    ctx.save();
    ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);

    // Fundo neutro caso haja pequenas bordas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

    // Aplica transformações: translação central + arrasto -> rotação -> escala
    ctx.translate(this.canvasSize / 2 + this.offsetX, this.canvasSize / 2 + this.offsetY);
    ctx.rotate((this.rotation() * Math.PI) / 180);
    ctx.scale(currentScale, currentScale);

    // Desenha a imagem centralizada no ponto de origem
    ctx.drawImage(
      this.loadedImage,
      -this.imageWidth / 2,
      -this.imageHeight / 2,
      this.imageWidth,
      this.imageHeight
    );

    ctx.restore();
  }

  // Interações de Mouse (Pan / Drag)
  onMouseDown(e: MouseEvent): void {
    if (this.isLoading() || !this.loadedImage) {
      return;
    }
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.initialOffsetX = this.offsetX;
    this.initialOffsetY = this.offsetY;
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) {
      return;
    }
    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;
    this.offsetX = this.initialOffsetX + deltaX;
    this.offsetY = this.initialOffsetY + deltaY;
    this.render();
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  onMouseLeave(): void {
    this.isDragging = false;
  }

  // Interações de Toque (Mobile)
  onTouchStart(e: TouchEvent): void {
    if (this.isLoading() || !this.loadedImage || e.touches.length === 0) {
      return;
    }
    this.isDragging = true;
    const touch = e.touches[0];
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;
    this.initialOffsetX = this.offsetX;
    this.initialOffsetY = this.offsetY;
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length === 0) {
      return;
    }
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.dragStartX;
    const deltaY = touch.clientY - this.dragStartY;
    this.offsetX = this.initialOffsetX + deltaX;
    this.offsetY = this.initialOffsetY + deltaY;
    this.render();
  }

  onTouchEnd(): void {
    this.isDragging = false;
  }

  // Zoom via Scroll Wheel
  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    this.setZoom(this.zoom() + delta);
  }

  // Controles de Zoom
  onZoomSliderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = parseFloat(target.value);
    this.setZoom(val);
  }

  public zoomIn(): void {
    this.setZoom(this.zoom() + 0.15);
  }

  public zoomOut(): void {
    this.setZoom(this.zoom() - 0.15);
  }

  private setZoom(newZoom: number): void {
    const clamped = Math.max(1.0, Math.min(3.5, Math.round(newZoom * 100) / 100));
    this.zoom.set(clamped);
    this.render();
  }

  // Rotação
  public rotateClockwise(): void {
    this.rotation.update((r) => (r + 90) % 360);
    this.calcularEscalaBase();
    this.render();
  }

  // Redefinir Enquadramento
  public resetarTransformacoes(): void {
    this.zoom.set(1.0);
    this.rotation.set(0);
    this.offsetX = 0;
    this.offsetY = 0;
    this.calcularEscalaBase();
    this.render();
  }

  // Exportação, Redimensionamento e Compressão do Enquadramento
  async aplicarEnquadramento(): Promise<void> {
    if (!this.loadedImage) {
      return;
    }

    this.isExporting.set(true);

    try {
      const outCanvas = document.createElement('canvas');
      outCanvas.width = this.outputSize;
      outCanvas.height = this.outputSize;
      const outCtx = outCanvas.getContext('2d');

      if (!outCtx) {
        throw new Error('Falha ao instanciar contexto gráfico para exportação.');
      }

      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';

      const ratio = this.outputSize / this.canvasSize;
      const currentScale = this.baseScale * this.zoom();

      outCtx.save();
      outCtx.translate(
        this.outputSize / 2 + this.offsetX * ratio,
        this.outputSize / 2 + this.offsetY * ratio
      );
      outCtx.rotate((this.rotation() * Math.PI) / 180);
      outCtx.scale(currentScale * ratio, currentScale * ratio);
      outCtx.drawImage(
        this.loadedImage,
        -this.imageWidth / 2,
        -this.imageHeight / 2,
        this.imageWidth,
        this.imageHeight
      );
      outCtx.restore();

      // Conversão com garantia de limite <= maxFileSizeKB (256 KB / 262.144 bytes)
      const maxBytes = this.maxFileSizeKB * 1024;
      let quality = 0.85;
      let blob = await this.canvasToBlobAsync(outCanvas, 'image/webp', quality);

      // Passo 1: Redução progressiva de qualidade
      while (blob.size > maxBytes && quality > 0.35) {
        quality -= 0.12;
        blob = await this.canvasToBlobAsync(outCanvas, 'image/webp', quality);
      }

      // Passo 2: Se ainda ultrapassar o limite, reduz as dimensões físicas do Canvas
      let currentDimension = this.outputSize;
      while (blob.size > maxBytes && currentDimension > 320) {
        currentDimension = Math.round(currentDimension * 0.85);
        const downscaledCanvas = document.createElement('canvas');
        downscaledCanvas.width = currentDimension;
        downscaledCanvas.height = currentDimension;
        const dCtx = downscaledCanvas.getContext('2d');
        if (dCtx) {
          dCtx.imageSmoothingEnabled = true;
          dCtx.imageSmoothingQuality = 'high';
          dCtx.drawImage(outCanvas, 0, 0, currentDimension, currentDimension);
          blob = await this.canvasToBlobAsync(downscaledCanvas, 'image/webp', 0.8);
        }
      }

      const originalName = this.data.imageFile?.name || 'foto-pet.webp';
      const safeName = originalName.replace(/\.[^/.]+$/, '') + '.webp';
      const file = new File([blob], safeName, { type: blob.type || 'image/webp' });
      const previewUrl = URL.createObjectURL(file);

      this.dialogRef.close({ file, previewUrl });
    } catch (err: unknown) {
      console.error('Erro ao recortar imagem:', err);
      this.errorMessage.set('Ocorreu um erro ao gerar a foto enquadrada. Tente novamente.');
    } finally {
      this.isExporting.set(false);
    }
  }

  private canvasToBlobAsync(
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
            // Fallback para JPEG caso WebP não esteja disponível
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) {
                  resolve(jpegBlob);
                } else {
                  reject(new Error('Falha na conversão de canvas para Blob.'));
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

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
