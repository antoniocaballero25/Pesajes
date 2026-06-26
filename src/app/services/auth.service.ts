import { Injectable } from "@angular/core";
import { Router } from "@angular/router";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  // =========================================================
  // 🔐 CREDENCIALES DEL ADMINISTRADOR (TÚ)
  // Con esto accedes al panel total (/admin-secret-panel)
  // =========================================================
  private readonly ADMIN_USER = "admin";
  private readonly ADMIN_PASS = "admin"; // Pon aquí tu clave maestra

  // =========================================================
  // 📋 CREDENCIALES DE LOS JUECES
  // Cambia esto para cada torneo. Acceden a su panel limitado (/juez)
  // =========================================================
  private readonly JUDGE_USER = "juez";
  private readonly JUDGE_PASS = "juez";

  constructor(private router: Router) {}

  /**
   * Comprueba el usuario y contraseña y devuelve el rol.
   * Guarda el rol en el almacenamiento del navegador para mantener la sesión.
   */
  login(user: string, pass: string): "admin" | "judge" | null {
    const userClean = user.trim();
    const passClean = pass.trim();

    if (userClean === this.ADMIN_USER && passClean === this.ADMIN_PASS) {
      localStorage.setItem("userRole", "admin");
      return "admin";
    }

    if (userClean === this.JUDGE_USER && passClean === this.JUDGE_PASS) {
      localStorage.setItem("userRole", "judge");
      return "judge";
    }

    // Si no coincide con ninguno, devuelve nulo (credenciales incorrectas)
    return null;
  }

  /**
   * Cierra la sesión borrando el rol y mandando al usuario a la portada
   */
  logout(): void {
    localStorage.removeItem("userRole");
    // Te redirige a la clasificación pública o a la pantalla de login, lo que prefieras
    this.router.navigate(["/"]);
  }

  /**
   * Devuelve qué rol está logueado actualmente
   */
  getRole(): "admin" | "judge" | null {
    return localStorage.getItem("userRole") as "admin" | "judge" | null;
  }

  /**
   * Comprueba si hay alguien logueado (sea admin o juez)
   */
  isAuthenticated(): boolean {
    return this.getRole() !== null;
  }
}
