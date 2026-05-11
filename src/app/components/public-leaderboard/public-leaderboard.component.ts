import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { TournamentService, Participant } from '../../services/tournament.service';

@Component({
  selector: 'app-public-leaderboard',
  templateUrl: './public-leaderboard.component.html',
  styleUrls: ['./public-leaderboard.component.scss']
})
export class PublicLeaderboardComponent implements OnInit {
  leaderboard$!: Observable<Participant[]>;

  displayedColumns: string[] = [
    'pos', 'names', 'pesquil',
    'p1', 'p2', 'p3', 'p4', 'p5',
    'totalWeight'
  ];

  // Lista de premios y sus colores
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

  constructor(private tournament: TournamentService) {}

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

  // Funciones para pintar el fondo de la celda según el premio
  getAwardBg(awardId?: string): string {
    const award = this.awardsList.find(a => a.id === awardId);
    return award && award.id !== 'NONE' ? award.bg : 'transparent';
  }

  // Funciones para pintar el texto de la celda según el premio
  getAwardColor(awardId?: string): string {
    const award = this.awardsList.find(a => a.id === awardId);
    return award && award.id !== 'NONE' ? award.color : '#2e7d32'; 
  }
}