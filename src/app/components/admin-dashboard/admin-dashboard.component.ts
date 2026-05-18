import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TournamentService, Participant } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';

// IMPORTANTE: El compresor mágico
import imageCompression from 'browser-image-compression';

type PanelMode = 'add' | 'edit';

interface EditTarget {
  participantId: number;
  fishIndex: number;
  currentWeight: number;
  currentAward?: string;
  currentCatchTime?: string;
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

  pesquilEditId: number | null = null;
  pesquilEditValue: number | null = null;
  pesquilLoading = false;

  displayedColumns: string[] = ['pos', 'names', 'pesquil', 'p1', 'p2', 'p3', 'p4', 'p5', 'total_weight', 'actions'];

  activeParticipantId: number | null = null;
  panelMode: PanelMode = 'add';
  editTarget: EditTarget | null = null;
  loading = false;

  // Variables para la foto
  selectedPhotoFile: File | null = null;
  photoPreview: string | null = null;

  constructor(
    private tournament: TournamentService,
    private auth: AuthService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.leaderboard$ = this.tournament.leaderboard$;
    this.participants$ = this.tournament.participants$;

    this.participantForm = this.fb.group({ names: ['', [Validators.required, Validators.minLength(3)]], pesquil: [null] });
    this.fishForm = this.fb.group({ weight: [null, [Validators.required, Validators.min(0.01)]], award: ['NONE'], catchTime: [this.getCurrentDateTime(), Validators.required] });
  }

  getCurrentDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  async addParticipant(): Promise<void> {
    if (this.participantForm.get('names')?.invalid) return;
    this.loading = true;
    try {
      await this.tournament.addParticipant(this.participantForm.value.names, this.participantForm.value.pesquil ? parseInt(this.participantForm.value.pesquil, 10) : null);
      this.snack.open(`✅ Añadido.`, 'OK', { duration: 3000 });
      this.participantForm.reset();
    } catch (e: any) { this.snack.open(`❌ ${e.message}`, 'OK', { duration: 4000 }); } 
    finally { this.loading = false; }
  }

  async removeParticipant(id: number, names: string): Promise<void> {
    if (!confirm(`¿Eliminar a "${names}"?`)) return;
    try {
      await this.tournament.removeParticipant(id);
      if (this.activeParticipantId === id) this.closePanel();
    } catch (e: any) { this.snack.open(`❌ ${e.message}`, 'OK', { duration: 3000 }); }
  }

  startPesquilEdit(id: number, val: number | null): void { this.pesquilEditId = id; this.pesquilEditValue = val; }
  cancelPesquilEdit(): void { this.pesquilEditId = null; this.pesquilEditValue = null; }
  async savePesquil(id: number): Promise<void> {
    if (!this.pesquilEditValue || this.pesquilEditValue < 1) return;
    this.pesquilLoading = true;
    try {
      await this.tournament.updatePesquil(id, this.pesquilEditValue);
      this.cancelPesquilEdit();
    } catch (e: any) { this.snack.open(`❌ ${e.message}`, 'OK', { duration: 4000 }); }
    finally { this.pesquilLoading = false; }
  }

  openAddPanel(participantId: number): void {
    if (this.activeParticipantId === participantId && this.panelMode === 'add') { this.closePanel(); return; }
    this.activeParticipantId = participantId;
    this.panelMode = 'add';
    this.editTarget = null;
    this.resetFishForm();
  }

  openEditPanel(participantId: number, fishIndex: number, currentWeight: number, currentAward: string = 'NONE', currentCatchTime?: string): void {
    this.activeParticipantId = participantId;
    this.panelMode = 'edit';
    this.editTarget = { participantId, fishIndex, currentWeight, currentAward, currentCatchTime };
    this.resetFishForm();
    this.fishForm.patchValue({ weight: currentWeight, award: currentAward || 'NONE', catchTime: currentCatchTime || this.getCurrentDateTime() });
  }

  closePanel(): void { this.activeParticipantId = null; this.editTarget = null; this.resetFishForm(); }

  resetFishForm(): void {
    this.fishForm.reset({ award: 'NONE', catchTime: this.getCurrentDateTime() });
    this.selectedPhotoFile = null;
    this.photoPreview = null;
  }

  // ─── LÓGICA DE COMPRESIÓN DE FOTO ───
  async onPhotoSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    // Configuración para que el Starlink ni lo note (baja calidad a máximo 1MB, 1024px)
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true };
    try {
      this.snack.open('Comprimiendo foto...', '', { duration: 1500 });
      this.selectedPhotoFile = await imageCompression(file, options);
      // Crear preview visual
      const reader = new FileReader();
      reader.onload = (e) => this.photoPreview = e.target?.result as string;
      reader.readAsDataURL(this.selectedPhotoFile);
    } catch (error) {
      this.snack.open('❌ Error al procesar la foto', 'OK', { duration: 3000 });
    }
  }

  async submitFish(): Promise<void> {
    if (this.fishForm.invalid || this.activeParticipantId === null) return;
    this.loading = true;

    const weight = parseFloat(parseFloat(this.fishForm.value.weight).toFixed(2));
    const awardId = this.fishForm.value.award === 'NONE' ? null : this.fishForm.value.award;
    const catchTime = this.panelMode === 'add' ? this.getCurrentDateTime() : this.fishForm.value.catchTime;

    let photoUrl = null;

    try {
      // 1. Subir la foto primero si existe
      if (this.selectedPhotoFile) {
        this.snack.open('Subiendo datos...', '', { duration: 2000 });
        photoUrl = await this.tournament.uploadPhoto(this.selectedPhotoFile);
      }

      // 2. Guardar en base de datos
      let result;
      if (this.panelMode === 'add') {
        result = await (this.tournament as any).addFish(this.activeParticipantId, weight, awardId, catchTime, photoUrl);
      } else if (this.editTarget) {
        result = await (this.tournament as any).editFish(this.editTarget.participantId, this.editTarget.fishIndex, weight, awardId, catchTime, photoUrl);
      }

      if (result?.success) {
        this.snack.open(result.message, 'OK', { duration: 3000, panelClass: 'snack-success' });
        this.closePanel();
      }
    } catch (e: any) {
      this.snack.open(`❌ Error: ${e.message}`, 'OK', { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  async deleteFish(participantId: number, fishIndex: number, weight: number): Promise<void> {
    if (!confirm(`¿Eliminar el pez de ${weight.toFixed(2)} kg?`)) return;
    await this.tournament.deleteFish(participantId, fishIndex);
    if (this.editTarget?.participantId === participantId && this.editTarget?.fishIndex === fishIndex) this.closePanel();
  }

  hasFish(fishes: number[], idx: number): boolean { return fishes && fishes[idx] !== undefined; }
  getAwardBg(awardId?: string): string { const aw = this.awardsList.find(a => a.id === awardId); return aw && aw.id !== 'NONE' ? aw.bg : 'transparent'; }
  getAwardColor(awardId?: string): string { const aw = this.awardsList.find(a => a.id === awardId); return aw && aw.id !== 'NONE' ? aw.color : '#2e7d32'; }
  getMedal(pos: number): string { return pos === 0 ? '🥇' : pos === 1 ? '🥈' : pos === 2 ? '🥉' : `${pos + 1}º`; }
  getPanelTitle(): string { return this.panelMode === 'edit' ? `Corregir Pez` : 'Añadir captura'; }
  getPanelButtonLabel(): string { return this.panelMode === 'edit' ? 'Guardar' : 'Registrar'; }
  logout(): void { this.auth.logout(); }
}