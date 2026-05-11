import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TournamentService, Participant } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';

// Modo del panel lateral: añadir nuevo pez o editar uno existente
type PanelMode = 'add' | 'edit';

interface EditTarget {
  participantId: number;
  fishIndex: number;
  currentWeight: number;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  leaderboard$!: Observable<Participant[]>;
  participants$!: Observable<Participant[]>;

  participantForm!: FormGroup;
  fishForm!: FormGroup;

  displayedColumns: string[] = [
    'pos', 'names', 'pesquil',
    'p1', 'p2', 'p3', 'p4', 'p5',
    'total_weight', 'actions'
  ];

  // Panel lateral: qué participante tiene el panel abierto
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
      pesquil: [null, [Validators.required, Validators.min(1), Validators.max(999)]]
    });

    this.fishForm = this.fb.group({
      weight: [null, [Validators.required, Validators.min(0.01), Validators.max(999)]]
    });
  }

  // ─── Participantes ────────────────────────────────────

  async addParticipant(): Promise<void> {
    if (this.participantForm.invalid) return;
    this.loading = true;
    const { names, pesquil } = this.participantForm.value;
    try {
      await this.tournament.addParticipant(names, pesquil);
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

  // ─── Panel añadir pez ─────────────────────────────────

  openAddPanel(participantId: number): void {
    if (this.activeParticipantId === participantId && this.panelMode === 'add') {
      this.closePanel();
      return;
    }
    this.activeParticipantId = participantId;
    this.panelMode = 'add';
    this.editTarget = null;
    this.fishForm.reset();
  }

  // ─── Panel editar pez ─────────────────────────────────

  openEditPanel(participantId: number, fishIndex: number, currentWeight: number): void {
    this.activeParticipantId = participantId;
    this.panelMode = 'edit';
    this.editTarget = { participantId, fishIndex, currentWeight };
    // Precarga el peso actual para que el juez lo vea y lo corrija
    this.fishForm.patchValue({ weight: currentWeight });
  }

  closePanel(): void {
    this.activeParticipantId = null;
    this.editTarget = null;
    this.fishForm.reset();
  }

  // ─── Enviar formulario de pez (añadir o editar) ───────

  async submitFish(): Promise<void> {
    if (this.fishForm.invalid || this.activeParticipantId === null) return;
    this.loading = true;

    const weight = parseFloat(parseFloat(this.fishForm.value.weight).toFixed(2));
    let result;

    try {
      if (this.panelMode === 'add') {
        result = await this.tournament.addFish(this.activeParticipantId, weight);
      } else if (this.editTarget) {
        result = await this.tournament.editFish(
          this.editTarget.participantId,
          this.editTarget.fishIndex,
          weight
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

  // ─── Eliminar un pez concreto ─────────────────────────

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

  getFish(fishes: number[], idx: number): string {
    return fishes[idx] !== undefined ? fishes[idx].toFixed(2) + ' kg' : '—';
  }

  hasFish(fishes: number[], idx: number): boolean {
    return fishes[idx] !== undefined;
  }

  getMedal(pos: number): string {
    if (pos === 0) return '🥇';
    if (pos === 1) return '🥈';
    if (pos === 2) return '🥉';
    return `${pos + 1}º`;
  }

  getPanelTitle(): string {
    if (this.panelMode === 'edit' && this.editTarget) {
      return `Corregir Pez ${this.editTarget.fishIndex + 1}`;
    }
    return 'Añadir captura';
  }

  getPanelButtonLabel(): string {
    return this.panelMode === 'edit' ? 'Guardar corrección' : 'Confirmar captura';
  }

  logout(): void { this.auth.logout(); }
}
