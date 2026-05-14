import { Component, OnInit, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TournamentService, Participant } from '../../services/tournament.service';

// IMPORTAMOS ANIMACIONES Y DIALOGS
import { trigger, style, transition, animate } from '@angular/animations';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-public-leaderboard',
  templateUrl: './public-leaderboard.component.html',
  styleUrls: ['./public-leaderboard.component.scss'],
  animations: [
    trigger('rowAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(30px)', opacity: 0 }),
        animate('1200ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class PublicLeaderboardComponent implements OnInit {
  leaderboard$!: Observable<Participant[]>;

  displayedColumns: string[] = [
    'pos', 'names', 'pesquil',
    'p1', 'p2', 'p3', 'p4', 'p5',
    'totalWeight'
  ];

  awardsList = [
    { id: 'NONE', label: 'Sin premio', bg: 'transparent', color: '#2e7d32' },
    { id: '2_DOM_MAN', label: '2º PEZ MAYOR DOMINGO MAÑANA', bg: '#e6b8b7', color: '#000' },
    { id: '2_SAB_MAN', label: '2º PEZ MAYOR SABADO MAÑANA', bg: '#95b3d7', color: '#000' },
    { id: '2_SAB_TAR', label: '2º PEZ MAYOR SABADO TARDE', bg: '#ffc000', color: '#000' },
    { id: '2_VIE_TAR', label: '2º PEZ MAYOR VIERNES TARDE', bg: '#ffff00', color: '#000' },
    { id: 'BARBO_MAYOR', label: 'BARBO MAYOR', bg: '#00ff00', color: '#000' },
    { id: 'CARPA_MAYOR', label: 'CARPA MAYOR', bg: '#ff0000', color: '#fff' },
    { id: '1_DOM_MAN', label: 'PEZ MAYOR DOMINGO MAÑANA', bg: '#205867', color: '#fff' },
    { id: '1_SAB_MAN', label: 'PEZ MAYOR SABADO MAÑANA', bg: '#38761d', color: '#fff' },
    { id: '1_SAB_TAR', label: 'PEZ MAYOR SABADO TARDE', bg: '#e26b0a', color: '#fff' },
    { id: '1_VIE_TAR', label: 'PEZ MAYOR VIERNES TARDE', bg: '#7030a0', color: '#fff' },
    { id: 'PRIMER_CUPO', label: 'PRIMER CUPO', bg: '#00ffff', color: '#000' }
  ];

  // Inyectamos MatDialog en el constructor
  constructor(
    private tournament: TournamentService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.leaderboard$ = this.tournament.leaderboard$;
  }

  getFish(fishes: number[], idx: number): string {
    return fishes && fishes[idx] !== undefined ? fishes[idx].toFixed(2) + ' kg' : '—';
  }

  getMedal(pos: number): string {
    if (pos === 0) return '🥇';
    if (pos === 1) return '🥈';
    if (pos === 2) return '🥉';
    return `${pos + 1}º`;
  }

  getAwardBg(awardId?: string): string {
    const award = this.awardsList.find(a => a.id === awardId);
    return award && award.id !== 'NONE' ? award.bg : 'transparent';
  }

  getAwardColor(awardId?: string): string {
    const award = this.awardsList.find(a => a.id === awardId);
    return award && award.id !== 'NONE' ? award.color : '#2e7d32'; 
  }

  trackByTeam(index: number, item: any): string {
    return item.id || item.names;
  }

  // FUNCIÓN QUE ABRE LA FICHA DEL EQUIPO
  openTeamDetails(team: Participant): void {
    this.dialog.open(TeamDetailsDialogComponent, {
      width: '500px',
      data: team,
      panelClass: 'custom-dialog-container'
    });
  }
}

// =====================================================================
// COMPONENTE PARA LA VENTANA EMERGENTE (FICHA DEL EQUIPO)
// Lo ponemos aquí para no tener que crear archivos nuevos
// =====================================================================
@Component({
  selector: 'app-team-details-dialog',
  template: `
    <div style="background-color: #1a237e; color: white; padding: 20px; border-radius: 4px 4px 0 0;">
      <h2 style="margin: 0; font-size: 22px; font-weight: 700;">{{ data.names }}</h2>
      <div style="margin-top: 8px; display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 50px; font-weight: 600;">
        Pesquil {{ data.pesquil }}
      </div>
    </div>
    
    <mat-dialog-content style="padding: 24px; background: #f8f9fa;">
      <h3 style="color: #333; margin-bottom: 16px; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px;">Registro de Capturas</h3>
      
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <ng-container *ngFor="let fish of data.fishes; let i = index">
          <div *ngIf="fish" style="background: white; padding: 12px 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #4caf50;">
            
            <div style="flex: 1;">
              <strong style="font-size: 16px; color: #1a237e;">Pez {{ i + 1 }}</strong>
              <div style="font-size: 18px; font-weight: 700; color: #b71c1c;">{{ fish | number:'1.2-2' }} kg</div>
            </div>
            
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
              <!-- MARCADOR DE HORA -->
              <span style="font-size: 12px; color: #666; display: flex; align-items: center; gap: 4px;">
                <mat-icon style="font-size: 16px; width: 16px; height: 16px;">access_time</mat-icon> 
                14:3{{i}}h <!-- Placeholder temporal de la hora -->
              </span>
              
              <!-- FOTO PLACEHOLDER (NIVEL DIOS) -->
              <span style="font-size: 11px; color: #1976d2; display: flex; align-items: center; gap: 4px; background: #e3f2fd; padding: 2px 8px; border-radius: 4px; cursor: pointer;">
                <mat-icon style="font-size: 14px; width: 14px; height: 14px;">image</mat-icon> Ver foto
              </span>
            </div>
            
          </div>
        </ng-container>
        
        <div *ngIf="!data.fishes || data.fishes.length === 0" style="text-align: center; color: #757575; padding: 20px 0;">
          Este equipo aún no ha pesado ninguna captura.
        </div>
      </div>
      
      <div style="margin-top: 24px; text-align: right; font-size: 20px;">
        Total: <strong style="color: #b71c1c;">{{ data.total_weight | number:'1.2-2' }} kg</strong>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end" style="padding: 16px; background: white; border-top: 1px solid #eee;">
      <button mat-stroked-button mat-dialog-close color="primary">Cerrar Ficha</button>
    </mat-dialog-actions>
  `
})
export class TeamDetailsDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}