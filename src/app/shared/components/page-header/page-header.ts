import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './page-header.html',
  styleUrls: ['./page-header.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  /**
   * Título principal exibido no cabeçalho da página (ex: 'Gestão de Pets')
   */
  readonly title = input.required<string>();

  /**
   * Descrição ou texto de apoio contextual exibido abaixo do título
   */
  readonly description = input<string>('');

  /**
   * Nome do ícone Material Symbols / Icons para a caixa de destaque (ex: 'pets')
   */
  readonly icon = input.required<string>();
}
