import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Observable } from "rxjs";
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  TournamentService,
  Participant,
} from "../../services/tournament.service";
import { AuthService } from "../../services/auth.service";

import imageCompression from "browser-image-compression";

type PanelMode = "add" | "edit";

interface EditTarget {
  participantId: number;
  fishIndex: number;
  currentWeight: number;
  currentAward?: string;
  currentCatchTime?: string;
  currentPhotoUrl?: string;
}

export const AWARDS_CATALOG = [
  { id: "NONE", label: "Sin premio", bg: "transparent", color: "#2e7d32" },
  {
    id: "1_PELOCHE",
    label: "1º ZONA DE PELOCHE",
    bg: "#e6b8b7",
    color: "#000",
  },
  {
    id: "1_LOS_PUENTES",
    label: "1º ZONA LOS PUENTES",
    bg: "#95b3d7",
    color: "#000",
  },
  { id: "1_LA_ISLA", label: "1º ZONA LA ISLA", bg: "#ffc000", color: "#000" },
  {
    id: "1_COLA_DE_LOS_BARBOS",
    label: "1º COLA DE LOS BARBOS",
    bg: "#ffff00",
    color: "#000",
  },
  { id: "BARBO_MAYOR", label: "BARBO MAYOR", bg: "#00ff00", color: "#000" },
  { id: "CARPA_MAYOR", label: "CARPA MAYOR", bg: "#ff0000", color: "#fff" },
  { id: "PRIMER_CUPO", label: "PRIMER CUPO", bg: "#00ffff", color: "#000" },
];

@Component({
  selector: "app-admin-dashboard",
  templateUrl: "./admin-dashboard.component.html",
  styleUrls: ["./admin-dashboard.component.scss"],
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

  displayedColumns: string[] = [
    "pos",
    "names",
    "pesquil",
    "p1",
    "p2",
    "p3",
    "p4",
    "p5",
    "total_weight",
    "actions",
  ];

  activeParticipantId: number | null = null;
  panelMode: PanelMode = "add";
  editTarget: EditTarget | null = null;
  loading = false;

  selectedPhotoFile: File | null = null;
  photoPreview: string | null = null;
  existingPhotoUrl: string | null = null;

  constructor(
    private tournament: TournamentService,
    private auth: AuthService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.leaderboard$ = this.tournament.leaderboard$;
    this.participants$ = this.tournament.participants$;

    this.participantForm = this.fb.group({
      names: ["", [Validators.required, Validators.minLength(3)]],
      pesquil: [null],
    });
    this.fishForm = this.fb.group({
      weight: [null, [Validators.required, Validators.min(0.01)]],
      award: ["NONE"],
      catchTime: [this.getCurrentDateTime(), Validators.required],
    });
  }

  getCurrentDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  async addParticipant(): Promise<void> {
    if (this.participantForm.get("names")?.invalid) return;
    this.loading = true;
    try {
      await this.tournament.addParticipant(
        this.participantForm.value.names,
        this.participantForm.value.pesquil
          ? parseInt(this.participantForm.value.pesquil, 10)
          : null,
      );
      this.snack.open(`✅ Añadido.`, "OK", { duration: 3000 });
      this.participantForm.reset();
    } catch (e: any) {
      this.snack.open(`❌ ${e.message}`, "OK", { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  async removeParticipant(id: number, names: string): Promise<void> {
    if (!confirm(`¿Eliminar a "${names}"?`)) return;
    try {
      await this.tournament.removeParticipant(id);
      if (this.activeParticipantId === id) this.closePanel();
    } catch (e: any) {
      this.snack.open(`❌ ${e.message}`, "OK", { duration: 3000 });
    }
  }

  startPesquilEdit(id: number, val: number | null): void {
    this.pesquilEditId = id;
    this.pesquilEditValue = val;
  }
  cancelPesquilEdit(): void {
    this.pesquilEditId = null;
    this.pesquilEditValue = null;
  }
  async savePesquil(id: number): Promise<void> {
    if (!this.pesquilEditValue || this.pesquilEditValue < 1) return;
    this.pesquilLoading = true;
    try {
      await this.tournament.updatePesquil(id, this.pesquilEditValue);
      this.cancelPesquilEdit();
    } catch (e: any) {
      this.snack.open(`❌ ${e.message}`, "OK", { duration: 4000 });
    } finally {
      this.pesquilLoading = false;
    }
  }

  openAddPanel(participantId: number): void {
    if (
      this.activeParticipantId === participantId &&
      this.panelMode === "add"
    ) {
      this.closePanel();
      return;
    }
    this.activeParticipantId = participantId;
    this.panelMode = "add";
    this.editTarget = null;
    this.resetFishForm();
  }

  openEditPanel(
    participantId: number,
    fishIndex: number,
    currentWeight: number,
    currentAward: string = "NONE",
    currentCatchTime?: string,
    currentPhotoUrl?: string,
  ): void {
    this.activeParticipantId = participantId;
    this.panelMode = "edit";
    this.editTarget = {
      participantId,
      fishIndex,
      currentWeight,
      currentAward,
      currentCatchTime,
      currentPhotoUrl,
    };
    this.resetFishForm();

    this.existingPhotoUrl = currentPhotoUrl || null;
    this.fishForm.patchValue({
      weight: currentWeight,
      award: currentAward || "NONE",
      catchTime: currentCatchTime || this.getCurrentDateTime(),
    });
  }

  closePanel(): void {
    this.activeParticipantId = null;
    this.editTarget = null;
    this.resetFishForm();
  }

  resetFishForm(): void {
    this.fishForm.reset({
      award: "NONE",
      catchTime: this.getCurrentDateTime(),
    });
    this.selectedPhotoFile = null;
    this.photoPreview = null;
    this.existingPhotoUrl = null;
  }

  async onPhotoSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };
    try {
      this.snack.open("Comprimiendo foto...", "", { duration: 1500 });
      this.selectedPhotoFile = await imageCompression(file, options);

      const reader = new FileReader();
      reader.onload = (e) => (this.photoPreview = e.target?.result as string);
      reader.readAsDataURL(this.selectedPhotoFile);
    } catch (error) {
      this.snack.open("❌ Error al procesar la foto", "OK", { duration: 3000 });
    }
  }

  async submitFish(): Promise<void> {
    if (this.fishForm.invalid || this.activeParticipantId === null) return;
    this.loading = true;

    const weight = parseFloat(
      parseFloat(this.fishForm.value.weight).toFixed(2),
    );
    // AQUÍ ESTÁ LA MAGIA: Pasamos el valor puro siempre, si es 'NONE' borrará el premio en BD
    const awardId = this.fishForm.value.award;
    const catchTime =
      this.panelMode === "add"
        ? this.getCurrentDateTime()
        : this.fishForm.value.catchTime;

    let photoUrl = this.existingPhotoUrl;

    try {
      if (this.selectedPhotoFile) {
        this.snack.open("Subiendo datos...", "", { duration: 2000 });
        photoUrl = await this.tournament.uploadPhoto(this.selectedPhotoFile);
      }

      let result;
      if (this.panelMode === "add") {
        result = await (this.tournament as any).addFish(
          this.activeParticipantId,
          weight,
          awardId,
          catchTime,
          photoUrl,
        );
      } else if (this.editTarget) {
        result = await (this.tournament as any).editFish(
          this.editTarget.participantId,
          this.editTarget.fishIndex,
          weight,
          awardId,
          catchTime,
          photoUrl,
        );
      }

      if (result?.success) {
        this.snack.open(result.message, "OK", {
          duration: 3000,
          panelClass: "snack-success",
        });
        this.closePanel();
      } else if (result && !result.success) {
        this.snack.open(
          "⚠️ No se puede agregar captura porque es menor a los peces de esta pareja",
          "OK",
          { duration: 5000 },
        );
      }
    } catch (e: any) {
      this.snack.open(`❌ Error: ${e.message}`, "OK", { duration: 4000 });
    } finally {
      this.loading = false;
    }
  }

  async deleteFish(
    event: Event,
    participantId: number,
    fishIndex: number,
    weight: number,
  ): Promise<void> {
    event.stopPropagation();
    const confirmar = window.confirm(
      `¿Eliminar el pez de ${weight.toFixed(2)} kg?`,
    );
    if (!confirmar) return;

    try {
      await this.tournament.deleteFish(participantId, fishIndex);
      this.snack.open("🗑️ Pez eliminado correctamente.", "OK", {
        duration: 3000,
      });
      if (
        this.editTarget?.participantId === participantId &&
        this.editTarget?.fishIndex === fishIndex
      ) {
        this.closePanel();
      }
    } catch (e: any) {
      this.snack.open(`❌ Error al eliminar: ${e.message}`, "OK", {
        duration: 4000,
      });
    }
  }

  hasFish(fishes: number[], idx: number): boolean {
    return fishes && fishes[idx] !== undefined;
  }
  getAwardBg(awardId?: string): string {
    const aw = this.awardsList.find((a) => a.id === awardId);
    return aw && aw.id !== "NONE" ? aw.bg : "transparent";
  }
  getAwardColor(awardId?: string): string {
    const aw = this.awardsList.find((a) => a.id === awardId);
    return aw && aw.id !== "NONE" ? aw.color : "#2e7d32";
  }
  getMedal(pos: number): string {
    return pos === 0
      ? "🥇"
      : pos === 1
        ? "🥈"
        : pos === 2
          ? "🥉"
          : `${pos + 1}º`;
  }
  getPanelTitle(): string {
    return this.panelMode === "edit" ? `Corregir Pez` : "Añadir captura";
  }
  getPanelButtonLabel(): string {
    return this.panelMode === "edit" ? "Guardar" : "Registrar";
  }
  logout(): void {
    this.auth.logout();
  }
}
