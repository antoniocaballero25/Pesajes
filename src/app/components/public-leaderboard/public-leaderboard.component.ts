import { Component, OnInit, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TournamentService, Participant } from '../../services/tournament.service';
import { trigger, style, transition, animate } from '@angular/animations';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface AwardCatalogItem {
  id: string; label: string; bg: string; color: string;
  winner?: { names: string; pesquil: number | null; weight: number; catchTime: string; photoUrl: string; fishIndex: number; participantInfo: Participant; };
}

@Component({
  selector: 'app-public-leaderboard',
  templateUrl: './public-leaderboard.component.html',
  styleUrls: ['./public-leaderboard.component.scss'],
  animations: [ trigger('rowAnimation', [ transition(':enter', [ style({ transform: 'translateY(30px)', opacity: 0 }), animate('1200ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ transform: 'translateY(0)', opacity: 1 })) ]) ]) ]
})
export class PublicLeaderboardComponent implements OnInit {
  leaderboard$!: Observable<Participant[]>;
  awardsList$!: Observable<AwardCatalogItem[]>;
  displayedColumns: string[] = ['pos', 'names', 'pesquil', 'p1', 'p2', 'p3', 'p4', 'p5', 'totalWeight'];
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

  constructor(private tournament: TournamentService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.leaderboard$ = this.tournament.leaderboard$;
    this.awardsList$ = this.leaderboard$.pipe(
      map(participants => {
        const updatedAwards = this.baseAwardsList.map(award => ({ ...award, winner: undefined } as AwardCatalogItem));
        participants.forEach(p => {
          if (p.awards && p.fishes) {
            p.awards.forEach((awardId, idx) => {
              if (awardId !== 'NONE') {
                const awardToUpdate = updatedAwards.find(a => a.id === awardId);
                if (awardToUpdate) {
                  awardToUpdate.winner = {
                    names: p.names, pesquil: p.pesquil, weight: p.fishes[idx],
                    catchTime: p.catchTimes ? p.catchTimes[idx] : '',
                    photoUrl: p.photoUrls ? p.photoUrls[idx] : '', // ← Mandamos la foto
                    fishIndex: idx, participantInfo: p
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

  getFish(fishes: number[], idx: number): string { return fishes && fishes[idx] !== undefined ? fishes[idx].toFixed(2) + ' kg' : '—'; }
  getMedal(pos: number): string { return pos === 0 ? '🥇' : pos === 1 ? '🥈' : pos === 2 ? '🥉' : `${pos + 1}º`; }
  getAwardBg(awardId?: string): string { const award = this.baseAwardsList.find(a => a.id === awardId); return award ? award.bg : 'transparent'; }
  getAwardColor(awardId?: string): string { const award = this.baseAwardsList.find(a => a.id === awardId); return award ? award.color : '#2e7d32'; }
  trackByTeam(index: number, item: any): string { return item.id || item.names; }

  openTeamDetails(team: Participant): void {
    if (!team) return;
    this.dialog.open(TeamDetailsDialogComponent, { width: '500px', data: { team, isAwardView: false }, panelClass: 'custom-dialog-container' });
  }

  openAwardDetails(award: AwardCatalogItem): void {
    if (!award.winner) return;
    this.dialog.open(TeamDetailsDialogComponent, {
      width: '500px',
      data: { team: award.winner.participantInfo, isAwardView: true, awardLabel: award.label, fishIndex: award.winner.fishIndex, awardBg: award.bg, awardColor: award.color },
      panelClass: 'custom-dialog-container'
    });
  }
}

@Component({
  selector: 'app-team-details-dialog',
  template: `
    <div style="background-color: #1a237e; color: white; padding: 20px; border-radius: 4px 4px 0 0;">
      <h2 style="margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase;">{{ data.team.names }}</h2>
      <div style="margin-top: 10px; display: flex; gap: 8px;">
        <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 700;">Pesquil {{ data.team.pesquil || '?' }}</span>
        <span style="background: #4caf50; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 700;">{{ data.team.fishes.length }} capturas</span>
      </div>
    </div>
    
    <mat-dialog-content style="padding: 0; background: #f4f6f8;">
      <div *ngIf="data.isAwardView" [style.backgroundColor]="data.awardBg" [style.color]="data.awardColor" style="padding: 12px 20px; font-weight: 800; text-align: center; text-transform: uppercase; border-bottom: 2px solid rgba(0,0,0,0.1);">
        🏆 {{ data.awardLabel }}
      </div>

      <div style="padding: 20px;">
        <h3 style="color: #666; margin-bottom: 15px; font-size: 14px; font-weight: 700; text-transform: uppercase;">{{ data.isAwardView ? 'Captura premiada' : 'Historial de pesajes' }}</h3>
        
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <ng-container *ngFor="let fish of data.team.fishes; let i = index">
            <div *ngIf="fish && (!data.isAwardView || i === data.fishIndex)" style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #eee;">
              
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="width: 45px; height: 45px; background: #e8eaf6; color: #1a237e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 900;">{{ i + 1 }}</div>
                  <div>
                    <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 800;">Captura</div>
                    <div style="font-size: 22px; font-weight: 900; color: #b71c1c;">{{ fish | number:'1.2-2' }} kg</div>
                  </div>
                </div>
                
                <div style="text-align: right; border-left: 2px solid #f0f0f0; padding-left: 15px;">
                  <div style="font-size: 12px; color: #1a237e; font-weight: 700; display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-bottom: 4px;">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px;">calendar_today</mat-icon>
                    {{ data.team.catchTimes && data.team.catchTimes[i] ? (data.team.catchTimes[i] | date:'dd/MM/yyyy') : '--/--/----' }}
                  </div>
                  <div style="font-size: 12px; color: #1a237e; font-weight: 700; display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px;">access_time</mat-icon>
                    {{ data.team.catchTimes && data.team.catchTimes[i] ? (data.team.catchTimes[i] | date:'HH:mm') + ' h' : '--:-- h' }}
                  </div>
                </div>
              </div>

              <div *ngIf="data.team.photoUrls && data.team.photoUrls[i]" style="margin-top: 15px; text-align: center; border-top: 1px dashed #ddd; padding-top: 15px;">
                <img [src]="data.team.photoUrls[i]" style="max-width: 100%; max-height: 250px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.2); object-fit: cover;">
              </div>
              
            </div>
          </ng-container>
        </div>
        
        <div *ngIf="!data.isAwardView" style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; border: 2px solid #c8e6c9;">
          <span style="font-weight: 800; color: #2e7d32; font-size: 13px; text-transform: uppercase;">Peso Total</span>
          <span style="font-size: 24px; font-weight: 900; color: #1b5e20;">{{ data.team.total_weight | number:'1.2-2' }} kg</span>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding: 15px; background: white;"><button mat-flat-button mat-dialog-close style="background-color: #1a237e; color: white;">Entendido</button></mat-dialog-actions>
  `
})
export class TeamDetailsDialogComponent { constructor(@Inject(MAT_DIALOG_DATA) public data: any) {} }