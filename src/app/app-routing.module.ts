import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicLeaderboardComponent } from './components/public-leaderboard/public-leaderboard.component';
import { LoginComponent } from './components/login/login.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { JudgeDashboardComponent } from "./judge-dashboard/judge-dashboard.component";
const routes: Routes = [
  {
    path: "",
    component: PublicLeaderboardComponent,
  },
  {
    path: "login",
    component: LoginComponent,
  },
  {
    path: "admin",
    component: AdminDashboardComponent,
    canActivate: [AuthGuard],
  },
  { path: "juez", component: JudgeDashboardComponent },
  {
    path: "**",
    redirectTo: "",
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
