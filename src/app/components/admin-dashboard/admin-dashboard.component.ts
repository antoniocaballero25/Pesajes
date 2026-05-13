import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TournamentService, Participant } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';

type PanelMode = 'add' | 'edit';

interface EditTarget {
  participantId: number;
  fishIndex: number;
  currentWeight: number;
  currentAward?: string;
}

export const AWARDS_CATALOG = [
  { id: 'NONE',        label: 'Sin premio',                    bg: 'transparent', color: '#2e7d32' },
  { id: '2_DOM_MAN',   label: '2º PEZ MAYOR DOMINGO MAÑANA',  bg: '#e6b8b7',     color: '#000' },
  { id: '2_SAB_MAN',   label: '2º PEZ MAYOR SABADO MAÑANA',   bg: '#95b3d7',     color: '#000' },
  { id: '2_SAB_TAR',   label: '2º PEZ MAYOR SABADO TARDE',    bg: '#ffc000',     color: '#000' },
  { id: '2_VIE_TAR',   label: '2º PEZ MAYOR VIERNES TARDE',   bg: '#ffff00',     color: '#000' },
  { id: 'BARBO_MAYOR', label: 'BARBO MAYOR',                   bg: '#00ff00',     color: '#000' },
  { id: 'CARPA_MAYOR', label: 'CARPA MAYOR',                   bg: '#ff0000',     color: '#fff' },
  { id: '1_DOM_MAN',   label: 'PEZ MAYOR DOMINGO MAÑANA',     bg: '#205867',     color: '#fff' },
  { id: '1_SAB_MAN',   label: 'PEZ MAYOR SABADO MAÑANA',      bg: '#38761d',     color: '#fff' },
  { id: '1_SAB_TAR',   label: 'PEZ MAYOR SABADO TARDE',       bg: '#e26b0a',     color: '#fff' },
  { id: '1_VIE_TAR',   label: 'PEZ MAYOR VIERNES TARDE',      bg: '#7030a0',     color: '#fff' },
  { id: 'PRIMER_CUPO', label: 'PRIMER CUPO',                   bg: '#00ffff',     color: '#000' }
];

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  leaderboard$!: Observable<Participant[]>;
  participants$!: Observable<Participant[]>;
  awardsList = AWARDS_CATALOG;

  participantForm!: FormGroup;
  fishForm!: FormGroup;

  // Formulario inline para editar el pesquil directamente en la tabla
  pesquilEditId: number | null = null;   // id del participante cuyo pesquil se está editando
  pesquilEditValue: number | null = null;
  pesquilLoading = false;

  displayedColumns: string[] = [
    'pos', 'names', 'pesquil',
    'p1', 'p2', 'p3', 'p4', 'p5',
    'total_weight', 'actions'
  ];

  activeParticipantId: number | null = null;
  panelMode: PanelMode = 'add';
  editTarget: EditTarget | null = null;
  loading = false;

  constructor(
    private tournament: TournamentService,
    private auth: AuthService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.leaderboard$ = this.tournament.leaderboard$;
    this.participants$ = this.tournament.participants$;

    this.participantForm = this.fb.group({
      names:   ['', [Validators.required, Validators.minLength(3)]],
      pesquil: [null]   // ya no es obligatorio
    });

    this.fishForm = this.fb.group({
      weight: [null, [Validators.required, Validators.min(0.01), Validators.max(999)]],
      award:  ['NONE']
    });
  }

  // ─── Participantes ────────────────────────────────────

  async addParticipant(): Promise<void> {
    if (this.participantForm.get('names')?.invalid) return;
    this.loading = true;
    const { names, pesquil } = this.participantForm.value;
    const pesquilVal = pesquil ? parseInt(pesquil, 10) : null;
    try {
      await this.tournament.addParticipant(names, pesquilVal);
      this.snack.open(`✅ "${names.toUpperCase()}" añadido.`, 'OK', { duration: 3000 });
      this.participantForm.reset();
    } catch (e: any) {
      this.snack.open(`❌ ${e.message}`, 'OK', { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  async removeParticipant(id: number, names: string): Promise<void> {
    if (!confirm(`¿Eliminar a "${names}"? Esta acción no se puede deshacer.`)) return;
    try {
      await this.tournament.removeParticipant(id);
      this.snack.open(`"${names}" eliminado.`, 'OK', { duration: 2500 });
      if (this.activeParticipantId === id) this.closePanel();
    } catch (e: any) {
      this.snack.open(`❌ ${e.message}`, 'OK', { duration: 3000 });
    }
  }

  // ─── Editar pesquil inline ────────────────────────────

  startPesquilEdit(participantId: number, currentValue: number | null): void {
    this.pesquilEditId = participantId;
    this.pesquilEditValue = currentValue;
  }

  cancelPesquilEdit(): void {
    this.pesquilEditId = null;
    this.pesquilEditValue = null;
  }

  async savePesquil(participantId: number): Promise<void> {
    if (!this.pesquilEditValue || this.pesquilEditValue < 1) {
      this.snack.open('Introduce un número de pesquil válido.', 'OK', { duration: 3000 });
      return;
    }
    this.pesquilLoading = true;
    try {
      await this.tournament.updatePesquil(participantId, this.pesquilEditValue);
      this.snack.open(`✅ Pesquil actualizado a ${this.pesquilEditValue}.`, 'OK', { duration: 2500 });
      this.cancelPesquilEdit();
    } catch (e: any) {
      this.snack.open(`❌ ${e.message}`, 'OK', { duration: 4000 });
    } finally {
      this.pesquilLoading = false;
    }
  }

  // ─── Panel añadir pez ─────────────────────────────────

  openAddPanel(participantId: number): void {
    if (this.activeParticipantId === participantId && this.panelMode === 'add') {
      this.closePanel();
      return;
    }
    this.activeParticipantId = participantId;
    this.panelMode = 'add';
    this.editTarget = null;
    this.fishForm.reset({ award: 'NONE' });
  }

  // ─── Panel editar pez ─────────────────────────────────

  openEditPanel(participantId: number, fishIndex: number, currentWeight: number, currentAward: string = 'NONE'): void {
    this.activeParticipantId = participantId;
    this.panelMode = 'edit';
    this.editTarget = { participantId, fishIndex, currentWeight, currentAward };
    this.fishForm.patchValue({ weight: currentWeight, award: currentAward || 'NONE' });
  }

  closePanel(): void {
    this.activeParticipantId = null;
    this.editTarget = null;
    this.fishForm.reset({ award: 'NONE' });
  }

  // ─── Enviar formulario pez ────────────────────────────

  async submitFish(): Promise<void> {
    if (this.fishForm.invalid || this.activeParticipantId === null) return;
    this.loading = true;

    const weight   = parseFloat(parseFloat(this.fishForm.value.weight).toFixed(2));
    const awardId  = this.fishForm.value.award === 'NONE' ? null : this.fishForm.value.award;
    let result;

    try {
      if (this.panelMode === 'add') {
        result = await this.tournament.addFish(this.activeParticipantId, weight, awardId);
      } else if (this.editTarget) {
        result = await this.tournament.editFish(
          this.editTarget.participantId,
          this.editTarget.fishIndex,
          weight,
          awardId
        );
      }

      if (result) {
        this.snack.open(result.message, 'OK', {
          duration: 4000,
          panelClass: result.success ? 'snack-success' : 'snack-warn'
        });
        if (result.success) this.closePanel();
      }
    } finally {
      this.loading = false;
    }
  }

  // ─── Eliminar pez ─────────────────────────────────────

  async deleteFish(participantId: number, fishIndex: number, weight: number): Promise<void> {
    if (!confirm(`¿Eliminar el pez de ${weight.toFixed(2)} kg?`)) return;
    const result = await this.tournament.deleteFish(participantId, fishIndex);
    this.snack.open(result.message, 'OK', {
      duration: 3000,
      panelClass: result.success ? 'snack-success' : 'snack-warn'
    });
    if (this.editTarget?.participantId === participantId &&
        this.editTarget?.fishIndex === fishIndex) {
      this.closePanel();
    }
  }

  // ─── Helpers ─────────────────────────────────────────

  hasFish(fishes: number[], idx: number): boolean {
    return fishes && fishes[idx] !== undefined;
  }

  getAwardBg(awardId?: string): string {
    const award = this.awardsList.find(a => a.id === awardId);
    return award && award.id !== 'NONE' ? award.bg : 'transparent';
  }

  getAwardColor(awardId?: string): string {
    const award = this.awardsList.find(a => a.id === awardId);
    return award && award.id !== 'NONE' ? award.color : '#2e7d32';
  }

  getMedal(pos: number): string {
    if (pos === 0) return '🥇';
    if (pos === 1) return '🥈';
    if (pos === 2) return '🥉';
    return `${pos + 1}º`;
  }

  getPanelTitle(): string {
    if (this.panelMode === 'edit' && this.editTarget) return `Corregir Pez ${this.editTarget.fishIndex + 1}`;
    return 'Añadir captura';
  }

  getPanelButtonLabel(): string {
    return this.panelMode === 'edit' ? 'Guardar corrección' : 'Confirmar captura';
  }

  logout(): void { this.auth.logout(); }
}
