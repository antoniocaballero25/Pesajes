import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loggedIn = false;

  // Credenciales hardcodeadas para demo
  private readonly CREDENTIALS = { user: 'admin', pass: 'admin' };

  constructor(private router: Router) {}

  login(username: string, password: string): boolean {
    if (username === this.CREDENTIALS.user && password === this.CREDENTIALS.pass) {
      this.loggedIn = true;
      return true;
    }
    return false;
  }

  logout(): void {
    this.loggedIn = false;
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    return this.loggedIn;
  }
}
