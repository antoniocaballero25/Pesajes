import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { ReactiveFormsModule, FormsModule } from "@angular/forms";

// =========================================
// MÓDULOS DE ANGULAR MATERIAL
// =========================================
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatCardModule } from "@angular/material/card";
import { MatTableModule } from "@angular/material/table";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatChipsModule } from "@angular/material/chips";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDividerModule } from "@angular/material/divider";
import { MatDialogModule } from "@angular/material/dialog";

// =========================================
// RUTAS
// =========================================
import { AppRoutingModule } from "./app-routing.module";

// =========================================
// COMPONENTES
// =========================================
import { AppComponent } from "./app.component";
import {
  PublicLeaderboardComponent,
  TeamDetailsDialogComponent,
} from "./components/public-leaderboard/public-leaderboard.component";
import { LoginComponent } from "./components/login/login.component";
import { AdminDashboardComponent } from "./components/admin-dashboard/admin-dashboard.component";
import { JudgeDashboardComponent } from "./components/judge-dashboard/judge-dashboard.component";

// =========================================
// PIPES (FILTROS)
// =========================================
import { MinPipe } from "./pipes/min.pipe";

@NgModule({
  declarations: [
    AppComponent,
    PublicLeaderboardComponent,
    TeamDetailsDialogComponent, // Modal emergente
    LoginComponent,
    AdminDashboardComponent,
    JudgeDashboardComponent, // Nuevo panel de jueces
    MinPipe,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule, // Necesario para el [(ngModel)] de los pesquiles

    // Importaciones de Material
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
