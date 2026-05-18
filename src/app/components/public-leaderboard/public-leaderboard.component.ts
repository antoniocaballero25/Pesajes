import { Component, OnInit, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TournamentService, Participant } from '../../services/tournament.service';

import { trigger, style, transition, animate } from '@angular/animations';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';

// Ampliamos la interfaz del catálogo para guardar quién es el ganador actual
export interface AwardCatalogItem {
  id: string;
  label: string;
  bg: string;
  color: string;
  winner?: {
    names: string;
    pesquil: number | null;
    weight: number;
    participantInfo: Participant; // Guardamos el participante entero para abrir su ficha al hacer clic
  };
}

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
  
  // Hacemos que la leyenda sea un Observable que se actualiza solo
  awardsList$!: Observable<AwardCatalogItem[]>;

  displayedColumns: string[] = [
    'pos', 'names', 'pesquil',
    'p1', 'p2', 'p3', 'p4', 'p5',
    'totalWeight'
  ];

  baseAwardsList: AwardCatalogItem[] = [
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

  constructor(
    private tournament: TournamentService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.leaderboard$ = this.tournament.leaderboard$;

    // MAGIA: Repasamos a todos los participantes y buscamos a los ganadores de los premios
    this.awardsList$ = this.leaderboard$.pipe(
      map(participants => {
        // SOLUCIÓN AL ERROR: Añadimos 'as AwardCatalogItem' para que TypeScript sepa qué forma tiene
        const updatedAwards = this.baseAwardsList.map(award => ({ 
          ...award, 
          winner: undefined 
        } as AwardCatalogItem));

        // Recorremos todos los peces de todos los participantes
        participants.forEach(p => {
          if (p.awards && p.fishes) {
            p.awards.forEach((awardId, idx) => {
              if (awardId !== 'NONE') {
                const awardToUpdate = updatedAwards.find(a => a.id === awardId);
                if (awardToUpdate) {
                  awardToUpdate.winner = {
                    names: p.names,
                    pesquil: p.pesquil,
                    weight: p.fishes[idx],
                    participantInfo: p // Guardamos todo para el modal
                  };
                }
              }
            });
          }
        });
        return updatedAwards;
      })
    );
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
    if (!awardId || awardId === 'NONE') return 'transparent';
    const award = this.baseAwardsList.find(a => a.id === awardId);
    return award ? award.bg : 'transparent';
  }

  getAwardColor(awardId?: string): string {
    if (!awardId || awardId === 'NONE') return '#2e7d32';
    const award = this.baseAwardsList.find(a => a.id === awardId);
    return award ? award.color : '#2e7d32'; 
  }

  trackByTeam(index: number, item: any): string {
    return item.id || item.names;
  }

  openTeamDetails(team: Participant): void {
    if (!team) return;
    this.dialog.open(TeamDetailsDialogComponent, {
      width: '500px',
      data: team,
      panelClass: 'custom-dialog-container'
    });
  }
}

// =====================================================================
// COMPONENTE PARA LA VENTANA EMERGENTE 
// =====================================================================
@Component({
  selector: 'app-team-details-dialog',
  template: `
    <div style="background-color: #1a237e; color: white; padding: 20px; border-radius: 4px 4px 0 0; position: relative;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700; padding-right: 30px;">{{ data.names }}</h2>
      <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
        <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 50px; font-size: 13px; font-weight: 600;">
          Pesquil {{ data.pesquil || '?' }}
        </span>
        <span style="background: #4caf50; color: white; padding: 4px 12px; border-radius: 50px; font-size: 13px; font-weight: 600;">
          {{ data.fishes ? data.fishes.length : 0 }} capturas
        </span>
      </div>
    </div>
    
    <mat-dialog-content style="padding: 20px; background: #fdfdfd;">
      <h3 style="color: #555; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px; font-size: 16px; font-weight: 600;">
        Historial de pesajes
      </h3>
      
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <ng-container *ngFor="let fish of data.fishes; let i = index">
          <div *ngIf="fish" style="background: white; padding: 12px; border-radius: 10px; border: 1px solid #efefef; display: flex; justify-content: space-between; align-items: center;">
            
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; background: #e8eaf6; color: #1a237e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800;">
                {{ i + 1 }}
              </div>
              <div>
                <div style="font-size: 12px; color: #777; text-transform: uppercase; font-weight: 600;">Captura</div>
                <div style="font-size: 18px; font-weight: 800; color: #b71c1c;">{{ fish | number:'1.2-2' }} kg</div>
              </div>
            </div>
            
            <div style="text-align: right; border-left: 1px solid #f0f0f0; padding-left: 15px;">
              <div style="font-size: 11px; color: #444; font-weight: 600; display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-bottom: 2px;">
                <mat-icon style="font-size: 14px; width: 14px; height: 14px; color: #1a237e;">calendar_today</mat-icon>
                {{ data.catchTimes && data.catchTimes[i] ? (data.catchTimes[i] | date:'dd/MM/yyyy') : 'Sin fecha' }}
              </div>
              
              <div style="font-size: 11px; color: #444; font-weight: 600; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                <mat-icon style="font-size: 14px; width: 14px; height: 14px; color: #1a237e;">access_time</mat-icon>
                {{ data.catchTimes && data.catchTimes[i] ? (data.catchTimes[i] | date:'HH:mm') + ' h' : '--:-- h' }}
              </div>
            </div>
            
          </div>
        </ng-container>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 600; color: #2e7d32;">PESO TOTAL ACUMULADO</span>
        <span style="font-size: 22px; font-weight: 900; color: #1b5e20;">{{ data.total_weight | number:'1.2-2' }} kg</span>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end" style="padding: 15px; border-top: 1px solid #eee;">
      <button mat-flat-button mat-dialog-close style="background-color: #1a237e; color: white;">Entendido</button>
    </mat-dialog-actions>
  `
})
export class TeamDetailsDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}