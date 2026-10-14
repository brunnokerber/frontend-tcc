import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DialogLayoutComponent } from '../dialog-layout/dialog-layout';

export interface ImagePreviewDialogData {
  imageUrl: string;
  title?: string;
  subtitle?: string;
}

@Component({
  selector: 'app-image-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DialogLayoutComponent,
  ],
  templateUrl: './image-preview-dialog.html',
  styleUrls: ['./image-preview-dialog.scss'],
})
export class ImagePreviewDialogComponent {
  public data: ImagePreviewDialogData = inject(MAT_DIALOG_DATA);
  public dialogRef = inject(MatDialogRef<ImagePreviewDialogComponent>);

  public isLoaded = signal<boolean>(false);
  public hasError = signal<boolean>(false);

  onImageLoad(): void {
    this.isLoaded.set(true);
  }

  onImageError(): void {
    this.hasError.set(true);
  }

  close(): void {
    this.dialogRef.close();
  }
}
