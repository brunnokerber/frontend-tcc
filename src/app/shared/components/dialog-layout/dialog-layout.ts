import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type DialogIconVariant = 'primary' | 'warn' | 'success' | 'warning' | 'info' | 'neutral';

@Component({
  selector: 'app-dialog-layout',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './dialog-layout.html',
  styleUrls: ['./dialog-layout.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogLayoutComponent {
  /**
   * Título principal exibido no cabeçalho padrão.
   */
  @Input() title?: string;

  /**
   * Subtítulo / descrição explicativa exibida abaixo do título.
   */
  @Input() subtitle?: string;

  /**
   * Nome do ícone Material Symbols / Icons para o badge do topo.
   */
  @Input() icon?: string;

  /**
   * Variante cromática aplicada à caixa de destaque do ícone.
   * Valores: 'primary' | 'warn' | 'success' | 'warning' | 'info' | 'neutral'.
   */
  @Input() iconVariant: DialogIconVariant = 'primary';

  /**
   * Largura / porte do modal.
   * sm (440px) | md (580px) | lg (720px) | xl (880px) | full (100%).
   */
  @Input() size: DialogSize = 'md';

  /**
   * Se o botão de fechar (X) deve ser exibido no cabeçalho.
   */
  @Input() showClose = true;

  /**
   * Se o botão de fechar deve estar desabilitado (ex: durante submissão ou salvamento).
   */
  @Input() closeDisabled = false;

  /**
   * Se a área de conteúdo (body) possui rolagem interna vertical segura.
   */
  @Input() scrollable = true;

  /**
   * Altura máxima customizável para o corpo rolável (ex: 'calc(90vh - 180px)').
   */
  @Input() maxBodyHeight?: string;

  /**
   * Classes utilitárias adicionais para o container do corpo.
   */
  @Input() bodyClass = '';

  /**
   * Evento emitido quando o botão de fechar (X) é clicado.
   */
  @Output() close = new EventEmitter<void>();

  onCloseClick(): void {
    if (!this.closeDisabled) {
      this.close.emit();
    }
  }
}
