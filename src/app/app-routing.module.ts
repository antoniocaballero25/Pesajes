import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

// Asegúrate de que las rutas a tus componentes son correctas
import { PublicLeaderboardComponent } from "./components/public-leaderboard/public-leaderboard.component";
import { LoginComponent } from "./components/login/login.component";
import { AdminDashboardComponent } from "./components/admin-dashboard/admin-dashboard.component";
import { JudgeDashboardComponent } from "./components/judge-dashboard/judge-dashboard.component";
import { AuthGuard } from "./guards/auth.guard";

const routes: Routes = [
  { path: "", component: PublicLeaderboardComponent },
  { path: "login", component: LoginComponent },

  // PANEL DEL ADMINISTRADOR (Tú)
  {
    path: "admin-secret-panel",
    component: AdminDashboardComponent,
    canActivate: [AuthGuard],
    data: { expectedRole: "admin" }, // <-- El guard lee esto y pide que seas admin
  },

  // PANEL DEL JUEZ
  {
    path: "juez",
    component: JudgeDashboardComponent,
    canActivate: [AuthGuard],
    data: { expectedRole: "judge" }, // <-- El guard lee esto y pide que seas juez
  },

  // Cualquier otra ruta que no exista o esté mal escrita, te manda al inicio
  { path: "**", redirectTo: "" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
