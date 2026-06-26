import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { MatSnackBar } from "@angular/material/snack-bar";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent {
  username = "";
  password = "";

  constructor(
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar,
  ) {}

  onSubmit(): void {
    // Llamamos al servicio y comprobamos el rol
    const rol = this.auth.login(this.username, this.password);

    if (rol === "admin") {
      this.snack.open("¡Bienvenido Administrador!", "OK", { duration: 2000 });
      this.router.navigate(["/admin-secret-panel"]); // Ruta a TU panel completo
    } else if (rol === "judge") {
      this.snack.open("Acceso de Juez concedido", "OK", { duration: 2000 });
      this.router.navigate(["/juez"]); // Ruta al NUEVO panel limitado
    } else {
      this.snack.open("❌ Usuario o contraseña incorrectos", "Cerrar", {
        duration: 3000,
      });
    }
  }
}
