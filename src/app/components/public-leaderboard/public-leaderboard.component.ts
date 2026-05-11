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

  constructor(private tournament: TournamentService) {}

  ngOnInit(): void {
    this.leaderboard$ = this.tournament.leaderboard$;
  }

  getFish(fishes: number[], idx: number): string {
    return fishes[idx] !== undefined ? fishes[idx].toFixed(2) + ' kg' : '—';
  }

  getMedal(pos: number): string {
    if (pos === 0) return '🥇';
    if (pos === 1) return '🥈';
    if (pos === 2) return '🥉';
    return `${pos + 1}º`;
  }
}