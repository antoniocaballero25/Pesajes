import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Location } from "@angular/common"; // Necesario para la función goBack()
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  hidePassword = true; // Controla el ojito de ver contraseña
  error: string | null = null; // Controla el mensaje rojo de error

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar,
    private location: Location,
  ) {}

  ngOnInit(): void {
    // Inicializamos el formulario reactivo que tu HTML espera
    this.loginForm = this.fb.group({
      username: ["", Validators.required],
      password: ["", Validators.required],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.error = null; // Reseteamos el error antes de probar
    const username = this.loginForm.value.username;
    const password = this.loginForm.value.password;

    // Llamamos al servicio de autenticación
    const rol = this.auth.login(username, password);

    if (rol === "admin") {
      this.snack.open("¡Bienvenido Administrador!", "OK", { duration: 2000 });
      this.router.navigate(["/admin-secret-panel"]); // Ruta a tu panel maestro
    } else if (rol === "judge") {
      this.snack.open("Acceso de Juez concedido", "OK", { duration: 2000 });
      this.router.navigate(["/juez"]); // Ruta al panel del juez
    } else {
      // Si falla, mostramos el error en el HTML
      this.error = "Usuario o contraseña incorrectos";
    }
  }

  goBack(): void {
    // Vuelve a la página anterior en el historial del navegador
    this.location.back();
  }
}
