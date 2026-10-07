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
  {
    id: "1_LA_ISLA",
    label: "1º ZONA LA ISLA",
    bg: "#ffc000",
    color: "#000",
  },
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
  selector: "app-judge-dashboard",
  templateUrl: "./judge-dashboard.component.html",
  styleUrls: ["./judge-dashboard.component.scss"],
})
export class JudgeDashboardComponent implements OnInit {
  leaderboard$!: Observable<Participant[]>;
  participants$!: Observable<Participant[]>;
  awardsList = AWARDS_CATALOG;

  fishForm!: FormGroup;
  // Sin la columna de acciones para borrar usuarios
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
    const awardId =
      this.fishForm.value.award === "NONE" ? null : this.fishForm.value.award;
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

      // ─── SOLUCIÓN ERROR ALERTA CUPO MALO ───
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

  // ─── SOLUCIÓN VENTANA CONFIRMACIÓN EN MÓVIL ───
  async deleteFish(
    event: Event,
    participantId: number,
    fishIndex: number,
    weight: number,
  ): Promise<void> {
    event.stopPropagation(); // Corta el clic pasante del móvil

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
