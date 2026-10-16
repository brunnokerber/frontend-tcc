import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type StatCardVariant =
  'primary' | 'success' | 'warning' | 'danger' | 'info' | 'adopted' | 'obito';

@Component({
  selector: 'app-stat-card, app-kpi-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './stat-card.html',
  styleUrls: ['./stat-card.scss'],
})
export class StatCardComponent {
  /**
   * Título descritivo do indicador / KPI (ex: "Total de Animais", "Doses Previstas")
   */
  public readonly label = input.required<string>();

  /**
   * Valor numérico ou textual a ser exibido em destaque (ex: 42, "12", "0")
   */
  public readonly value = input.required<string | number>();

  /**
   * Ícone Material Design a ser exibido no badge lateral (ex: "pets", "schedule", "people")
   */
  public readonly icon = input.required<string>();

  /**
   * Variante visual semântica para coloração do badge e do texto do valor
   */
  public readonly variant = input<StatCardVariant>('primary');

  /**
   * Classe CSS customizada opcional para o valor (sobrescreve a cor padrão da variante)
   */
  public readonly customValueClass = input<string | null>(null, { alias: 'valueClass' });

  /**
   * Classe CSS customizada opcional para o wrapper do ícone (sobrescreve a cor padrão da variante)
   */
  public readonly customIconClass = input<string | null>(null, { alias: 'iconClass' });

  /**
   * Classe computada para estilização do texto do valor em destaque
   */
  public readonly resolvedValueClass = computed(() => {
    const custom = this.customValueClass();
    if (custom) {
      return custom;
    }

    switch (this.variant()) {
      case 'success':
        return 'text-status-success';
      case 'warning':
        return 'text-status-warning';
      case 'danger':
        return 'text-danger';
      case 'info':
        return 'text-status-info';
      case 'adopted':
        return 'text-status-adopted';
      case 'obito':
        return 'text-status-obito';
      case 'primary':
      default:
        return 'text-surface-main';
    }
  });

  /**
   * Classe computada para coloração do container circular do ícone
   */
  public readonly resolvedIconWrapperClass = computed(() => {
    const custom = this.customIconClass();
    if (custom) {
      return custom;
    }

    switch (this.variant()) {
      case 'success':
        return 'bg-status-success';
      case 'warning':
        return 'bg-status-warning';
      case 'danger':
        return 'bg-danger-subtle text-danger';
      case 'info':
        return 'bg-status-info';
      case 'adopted':
        return 'bg-status-adopted';
      case 'obito':
        return 'bg-status-obito';
      case 'primary':
      default:
        return 'bg-status-primary';
    }
  });
}

// Alias export para máxima flexibilidade semântica (KpiCardComponent / StatCardComponent)
export { StatCardComponent as KpiCardComponent };
