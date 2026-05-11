import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TournamentService, Participant } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  leaderboard$!: Observable<Participant[]>;
  participants$!: Observable<Participant[]>;

  participantForm!: FormGroup;
  fishForms: { [id: number]: FormGroup } = {};

  displayedColumns: string[] = [
    'pos', 'names', 'pesquil',
    'p1', 'p2', 'p3', 'p4', 'p5',
    'totalWeight', 'actions'
  ];

  activeParticipantId: number | null = null;
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
  }

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
    try {
      await this.tournament.removeParticipant(id);
      this.snack.open(`"${names}" eliminado.`, 'OK', { duration: 2500 });
      if (this.activeParticipantId === id) this.activeParticipantId = null;
    } catch (e: any) {
      this.snack.open(`❌ ${e.message}`, 'OK', { duration: 3000 });
    }
  }

  toggleFishPanel(id: number): void {
    this.activeParticipantId = this.activeParticipantId === id ? null : id;
    if (!this.fishForms[id]) {
      this.fishForms[id] = this.fb.group({
        weight: [null, [Validators.required, Validators.min(0.01), Validators.max(99)]]
      });
    }
  }

  getFishForm(id: number): FormGroup {
    if (!this.fishForms[id]) {
      this.fishForms[id] = this.fb.group({
        weight: [null, [Validators.required, Validators.min(0.01), Validators.max(99)]]
      });
    }
    return this.fishForms[id];
  }

  async submitFish(participantId: number): Promise<void> {
    const form = this.getFishForm(participantId);
    if (form.invalid) return;
    this.loading = true;
    try {
      const weight = parseFloat(form.value.weight);
      const result = await this.tournament.addFish(participantId, weight);
      this.snack.open(result.message, 'OK', {
        duration: 4000,
        panelClass: result.success ? 'snack-success' : 'snack-warn'
      });
      if (result.success) {
        form.reset();
        this.activeParticipantId = null;
      }
    } finally {
      this.loading = false;
    }
  }

  getFish(fishes: number[], idx: number): string {
    return fishes[idx] !== undefined ? fishes[idx].toFixed(2) + ' kg' : '—';
  }

  getMedal(pos: number): string {
    if (pos === 0) return '🥇';
    if (pos === 1) return '🥈';
    if (pos === 2) return '🥉';
    return `${pos + 1}º`;
  }

  logout(): void { this.auth.logout(); }
}