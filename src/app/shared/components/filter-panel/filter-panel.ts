import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './filter-panel.html',
  styleUrls: ['./filter-panel.scss'],
})
export class FilterPanelComponent {
  /**
   * Evento emitido quando o formulário é submetido (Enter ou clique em 'Filtrar')
   */
  public readonly search = output<void>();

  /**
   * Evento emitido quando o botão 'Limpar' é acionado
   */
  public readonly clear = output<void>();

  /**
   * Estado de carregamento do filtro (desabilita ações e exibe spinner no botão primário)
   */
  public readonly loading = input<boolean>(false);

  /**
   * Condição para desabilitar o botão 'Limpar' quando nenhum filtro está ativo
   */
  public readonly clearDisabled = input<boolean>(false);

  /**
   * Condição adicional para desabilitar o botão 'Filtrar'
   */
  public readonly submitDisabled = input<boolean>(false);

  /**
   * Rótulo textual do botão de busca/filtro
   */
  public readonly submitLabel = input<string>('Filtrar');

  /**
   * Rótulo textual durante o estado de carregamento
   */
  public readonly loadingLabel = input<string>('Filtrando...');

  /**
   * Rótulo textual do botão de limpeza
   */
  public readonly clearLabel = input<string>('Limpar');

  /**
   * Classes Bootstrap da coluna que encapsula os botões de ação
   */
  public readonly actionsColClass = input<string>('col-12 col-md-3 col-lg-3');

  /**
   * Habilita projeção de ações customizadas via [filter-actions] em vez dos botões padrão
   */
  public readonly customActions = input<boolean>(false);

  public onSubmit(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.loading() && !this.submitDisabled()) {
      this.search.emit();
    }
  }

  public onClear(): void {
    if (!this.loading() && !this.clearDisabled()) {
      this.clear.emit();
    }
  }
}
