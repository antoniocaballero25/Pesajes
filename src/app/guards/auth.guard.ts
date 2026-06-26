import { Injectable } from "@angular/core";
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from "@angular/router";
import { AuthService } from "../services/auth.service"; // Comprueba que la ruta a tu servicio es correcta

@Injectable({
  providedIn: "root",
})
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean {
    const rol = this.auth.getRole(); // Nos dirá si es 'admin', 'judge' o null

    // 1. Si no hay nadie logueado (rol es null), a la calle (al login)
    if (!rol) {
      this.router.navigate(["/login"]); // Si tu ruta de login es distinta, cámbiala aquí
      return false;
    }

    // 2. Comprobamos si la ruta a la que intenta ir exige un rol específico
    const expectedRole = route.data["expectedRole"];

    if (expectedRole && expectedRole !== rol) {
      // Si el juez intenta entrar a tu panel de admin, lo mandamos de vuelta a su panel
      if (rol === "judge") {
        this.router.navigate(["/juez"]);
      } else {
        // Si tú intentas entrar al del juez, te manda al tuyo
        this.router.navigate(["/admin-secret-panel"]);
      }
      return false;
    }

    // Si estás logueado y tu rol coincide con el que pide la ruta, la puerta se abre
    return true;
  }
}
