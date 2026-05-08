# 🎣 Concurso de Pesca 2025 — Aplicación Angular

## Estructura del proyecto

```
src/app/
├── app.component.ts              ← Raíz (solo router-outlet)
├── app.module.ts                 ← Módulo principal con todas las importaciones
├── app-routing.module.ts         ← Rutas: /, /login, /admin
│
├── services/
│   ├── tournament.service.ts     ← Lógica de negocio + BehaviorSubject
│   └── auth.service.ts           ← Login/logout (admin/admin)
│
├── guards/
│   └── auth.guard.ts             ← Protege la ruta /admin
│
├── pipes/
│   └── min.pipe.ts               ← Calcula el mínimo de un array en plantillas
│
└── components/
    ├── public-leaderboard/       ← Vista pública (sin login)
    ├── login/                    ← Pantalla de login
    └── admin-dashboard/          ← Panel de jueces (protegido)
```

## Puesta en marcha

### 1. Requisitos previos
- Node.js 18+ instalado
- Angular CLI instalado globalmente:

```bash
npm install -g @angular/cli
```

### 2. Crear el proyecto base

```bash
ng new concurso-pesca --routing --style=scss
cd concurso-pesca
```

### 3. Instalar Angular Material

```bash
ng add @angular/material
# Elegir tema: Indigo/Pink (o cualquiera)
# Confirmar tipografía global: Yes
# Confirmar animaciones: Yes
```

### 4. Copiar los archivos

Reemplaza los archivos generados por los de este proyecto. La estructura de carpetas es la misma que la de `ng new`.

### 5. Arrancar el servidor de desarrollo

```bash
ng serve --open
```

La app se abrirá en `http://localhost:4200`

---

## Credenciales de acceso al panel de jueces

| Usuario | Contraseña |
|---------|------------|
| admin   | admin      |

---

## Regla de los 5 peces (lógica de negocio)

Implementada en `TournamentService.addFish()`:

1. Si el participante tiene **< 5 peces** → el peso se añade directamente.
2. Si el participante tiene **exactamente 5 peces**:
   - Se busca el pez de **menor peso** (`Math.min(...fishes)`).
   - Si el nuevo pez **pesa más** → se sustituye el menor.
   - Si el nuevo pez **pesa igual o menos** → se descarta con aviso.
3. El `totalWeight` se recalcula automáticamente tras cada cambio.

---

## Rutas de la aplicación

| Ruta     | Componente                  | Acceso       |
|----------|-----------------------------|--------------|
| `/`      | PublicLeaderboardComponent  | Público      |
| `/login` | LoginComponent              | Público      |
| `/admin` | AdminDashboardComponent     | Solo jueces  |
