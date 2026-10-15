import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastService } from '@core/services/toast.service';
import { VacinaDialogComponent } from '@features/pets/components/vacina-dialog/vacina-dialog';
import { getTipoBadgeClass, getTipoFaIcon, Pet } from '@features/pets/models/pet.model';
import { VacinaCalendarioFiltro, VacinaCalendarioItem } from '@features/pets/models/vacina.model';
import { PetsService } from '@features/pets/services/pets.service';
import { VacinasService } from '@features/pets/services/vacinas.service';
import { getTodayIso } from '@shared/utils/string-utils';

export interface DiaCalendario {
  date: Date;
  isoDate: string;
  diaNumero: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
  vacinas: VacinaCalendarioItem[];
}

export interface GrupoDataAgenda {
  isoDate: string;
  data: Date;
  isToday: boolean;
  isPast: boolean;
  vacinas: VacinaCalendarioItem[];
}

@Component({
  selector: 'app-calendario-vacinal',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './calendario-vacinal.html',
  styleUrls: ['./calendario-vacinal.scss'],
})
export default class CalendarioVacinalComponent implements OnInit {
  private vacinasService = inject(VacinasService);
  private petsService = inject(PetsService);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  public readonly loading = signal<boolean>(false);
  public readonly selectedDate = signal<Date>(new Date());
  public readonly viewMode = signal<'grade' | 'agenda'>('grade');

  // Filtro de pet contextual (via URL param ?petId=X)
  public readonly petFilter = signal<number | null>(null);
  public readonly petSelecionado = signal<Pet | null>(null);

  public readonly vacinas = signal<VacinaCalendarioItem[]>([]);
  public readonly hojeIso = getTodayIso();

  public readonly mesesNomes = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  public readonly diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Label do Mês/Ano Corrente
  public readonly mesAnoLabel = computed(() => {
    const d = this.selectedDate();
    return `${this.mesesNomes[d.getMonth()]} de ${d.getFullYear()}`;
  });

  // Estatísticas / KPIs do Mês
  public readonly kpis = computed(() => {
    const all = this.vacinas();
    const total = all.length;
    let aplicadas = 0;
    let previstas = 0;
    let atrasadas = 0;

    for (const v of all) {
      if (v.data_aplicacao) {
        aplicadas++;
      } else {
        previstas++;
        if (v.data_prevista && v.data_prevista < this.hojeIso) {
          atrasadas++;
        }
      }
    }

    return { total, aplicadas, previstas, atrasadas };
  });

  // Grade de Dias do Mês (6 semanas x 7 dias)
  public readonly diasGrade = computed<DiaCalendario[]>(() => {
    const ref = this.selectedDate();
    const year = ref.getFullYear();
    const month = ref.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const dias: DiaCalendario[] = [];
    const vacinasMap = new Map<string, VacinaCalendarioItem[]>();

    for (const v of this.vacinas()) {
      if (!v.data_prevista) continue;
      const iso = v.data_prevista.split('T')[0];
      const arr = vacinasMap.get(iso) || [];
      arr.push(v);
      vacinasMap.set(iso, arr);
    }

    // Dias do mês anterior para completar a primeira semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const iso = this.formatDateIso(d);
      dias.push({
        date: d,
        isoDate: iso,
        diaNumero: d.getDate(),
        isCurrentMonth: false,
        isToday: iso === this.hojeIso,
        isPast: iso < this.hojeIso,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        vacinas: vacinasMap.get(iso) || [],
      });
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const iso = this.formatDateIso(d);
      dias.push({
        date: d,
        isoDate: iso,
        diaNumero: day,
        isCurrentMonth: true,
        isToday: iso === this.hojeIso,
        isPast: iso < this.hojeIso,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        vacinas: vacinasMap.get(iso) || [],
      });
    }

    // Dias do próximo mês para completar a última semana
    const remainingDays = 42 - dias.length;
    for (let day = 1; day <= remainingDays; day++) {
      const d = new Date(year, month + 1, day);
      const iso = this.formatDateIso(d);
      dias.push({
        date: d,
        isoDate: iso,
        diaNumero: day,
        isCurrentMonth: false,
        isToday: iso === this.hojeIso,
        isPast: iso < this.hojeIso,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        vacinas: vacinasMap.get(iso) || [],
      });
    }

    return dias;
  });

  // Lista da Visão Agenda (Mês)
  public readonly gruposAgenda = computed<GrupoDataAgenda[]>(() => {
    const list = this.vacinas();
    const map = new Map<string, VacinaCalendarioItem[]>();

    for (const v of list) {
      if (!v.data_prevista) continue;
      const iso = v.data_prevista.split('T')[0];
      const arr = map.get(iso) || [];
      arr.push(v);
      map.set(iso, arr);
    }

    const sortedDates = Array.from(map.keys()).sort();
    return sortedDates.map((iso) => {
      const parts = iso.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return {
        isoDate: iso,
        data: d,
        isToday: iso === this.hojeIso,
        isPast: iso < this.hojeIso,
        vacinas: map.get(iso) || [],
      };
    });
  });

  async ngOnInit(): Promise<void> {
    const petIdParam = this.route.snapshot.queryParams['petId'];
    if (petIdParam) {
      const id = Number(petIdParam);
      if (!isNaN(id)) {
        this.petFilter.set(id);
        this.carregarPetFiltro(id);
      }
    }

    await this.carregarVacinas();
  }

  private async carregarPetFiltro(petId: number): Promise<void> {
    try {
      const pet = await this.petsService.getPetById(petId);
      this.petSelecionado.set(pet);
    } catch {
      this.petSelecionado.set(null);
    }
  }

  public async carregarVacinas(): Promise<void> {
    this.loading.set(true);
    try {
      const d = this.selectedDate();
      const year = d.getFullYear();
      const month = d.getMonth();

      // Margem para abranger dias adjacentes que aparecem na grade de 6 semanas
      const first = new Date(year, month, -6);
      const last = new Date(year, month + 1, 14);

      const filtro: VacinaCalendarioFiltro = {
        startDate: this.formatDateIso(first),
        endDate: this.formatDateIso(last),
        petId: this.petFilter(),
      };

      const result = await this.vacinasService.getVacinasCalendario(filtro);
      this.vacinas.set(result);
    } finally {
      this.loading.set(false);
    }
  }

  public mesAnterior(): void {
    const d = this.selectedDate();
    this.selectedDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.carregarVacinas();
  }

  public mesSeguinte(): void {
    const d = this.selectedDate();
    this.selectedDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.carregarVacinas();
  }

  public irParaHoje(): void {
    this.selectedDate.set(new Date());
    this.carregarVacinas();
  }

  public limparFiltroPet(): void {
    this.petFilter.set(null);
    this.petSelecionado.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { petId: null },
      queryParamsHandling: 'merge',
    });
    this.carregarVacinas();
  }

  public abrirModalVacina(vacina?: VacinaCalendarioItem, defaultDataPrevista?: string): void {
    const dialogRef = this.dialog.open(VacinaDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        vacina: vacina || null,
        petId: vacina?.id_pet || this.petFilter() || undefined,
        pet: vacina?.pet || this.petSelecionado() || undefined,
        defaultDataPrevista: defaultDataPrevista || undefined,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && (result.action === 'saved' || result.action === 'deleted')) {
        this.carregarVacinas();
      }
    });
  }

  public async aplicarRapido(event: MouseEvent, vacina: VacinaCalendarioItem): Promise<void> {
    event.stopPropagation();
    if (!vacina.id) return;

    try {
      const updated = await this.vacinasService.aplicarVacinaRapida(vacina.id);
      if (updated) {
        this.toast.success(`Vacina "${vacina.nome_vacina}" marcada como aplicada!`);
        await this.carregarVacinas();
      }
    } catch {
      // Toast já tratado no service
    }
  }

  public formatDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  public formatIsoBr(iso: string): string {
    if (!iso) return '';
    const parts = iso.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return iso;
  }

  public getTipoFaIcon(tipo: string | undefined): string {
    return getTipoFaIcon(tipo || '');
  }

  public getTipoBadgeClass(tipo: string | undefined): string {
    return getTipoBadgeClass(tipo || '');
  }
}
