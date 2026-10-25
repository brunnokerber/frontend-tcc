import { CommonModule, DatePipe, SlicePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { ProfileResumo } from '@core/audit/models/audit.model';
import { AuditResolverService } from '@core/audit/services/audit-resolver.service';
import { UserProfile } from '@core/auth/models/login.model';
import { AuthService } from '@core/auth/services/auth.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-audit-badge',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    SlicePipe,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './audit-badge.html',
  styleUrl: './audit-badge.scss',
})
export class AuditBadgeComponent {
  private auditResolver = inject(AuditResolverService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  /** Data da última alteração (ISO string ou timestamp) */
  readonly updatedAt = input<string | null | undefined>();

  /** UUID do usuário responsável pela alteração */
  readonly updatedBy = input<string | null | undefined>();

  /** Dados pré-carregados do editor (opcional) */
  readonly editor = input<ProfileResumo | null | undefined>();

  /** Modo compacto: oculta o texto "Última alteração:" e exibe apenas os chips */
  readonly compact = input<boolean>(false);

  /** Exibir a data de modificação */
  readonly showDate = input<boolean>(true);

  /** Identifica se o usuário atual é administrador */
  readonly isAdmin = computed(() => this.authService.isAdmin());

  readonly loading = signal<boolean>(false);
  readonly loaded = signal<boolean>(false);
  readonly userProfile = signal<UserProfile | null>(null);

  /**
   * Disparado ao abrir o popover (menu).
   * Resolve o perfil do usuário via cache em memória ou consulta sob demanda.
   */
  async onPopoverOpen(): Promise<void> {
    if (!this.isAdmin()) {
      return;
    }

    const uuid = this.updatedBy();
    if (!uuid) {
      return;
    }

    // Se já foi carregado para este mesmo ID, evita requisições extras
    if (this.loaded() && this.userProfile()?.id === uuid) {
      return;
    }

    // Se já possuímos dados do editor passados como input
    const preEditor = this.editor();
    if (preEditor && preEditor.id === uuid && preEditor.email) {
      this.userProfile.set({
        id: preEditor.id,
        email: preEditor.email,
        role: (preEditor.role as 'admin' | 'user') || 'user',
        ativo: true,
      });
      this.loaded.set(true);
      return;
    }

    this.loading.set(true);
    try {
      const profile = await this.auditResolver.resolveUser(uuid);
      this.userProfile.set(profile);
      this.loaded.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Copia um valor para a área de transferência com feedback amigável via Toast
   */
  async copyText(text: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success(`${label} copiado para a área de transferência!`);
    } catch {
      this.toast.error(`Não foi possível copiar o ${label.toLowerCase()}.`);
    }
  }
}
