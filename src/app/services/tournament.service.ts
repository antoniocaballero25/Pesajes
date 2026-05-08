import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Participant {
  id: number;
  names: string;
  pesquil: number;
  fishes: number[];
  totalWeight: number;
}

export interface FishResult {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private nextId = 1;
  private participantsSubject = new BehaviorSubject<Participant[]>([]);

  // Observable público con la clasificación ordenada de mayor a menor peso
  readonly leaderboard$: Observable<Participant[]> = this.participantsSubject.pipe(
    map(list => [...list].sort((a, b) => b.totalWeight - a.totalWeight))
  );

  // Observable con la lista sin ordenar (para el panel de admin)
  readonly participants$: Observable<Participant[]> = this.participantsSubject.asObservable();

  addParticipant(names: string, pesquil: number): void {
    const current = this.participantsSubject.getValue();

    // Verificar que el pesquil no esté repetido
    if (current.some(p => p.pesquil === pesquil)) {
      throw new Error(`El pesquil número ${pesquil} ya está asignado.`);
    }

    const newParticipant: Participant = {
      id: this.nextId++,
      names: names.toUpperCase().trim(),
      pesquil,
      fishes: [],
      totalWeight: 0
    };

    this.participantsSubject.next([...current, newParticipant]);
  }

  removeParticipant(id: number): void {
    const updated = this.participantsSubject.getValue().filter(p => p.id !== id);
    this.participantsSubject.next(updated);
  }

  /**
   * Lógica de negocio principal: regla de los 5 peces.
   *
   * - Si el participante tiene < 5 peces: añade el nuevo peso directamente.
   * - Si tiene 5 peces (cupo lleno):
   *     · Si el nuevo pez pesa MÁS que el mínimo actual → sustituye el mínimo.
   *     · Si el nuevo pez pesa IGUAL o MENOS que el mínimo → descarta y avisa.
   *
   * Tras cualquier cambio recalcula totalWeight automáticamente.
   */
  addFish(participantId: number, weight: number): FishResult {
    const list = this.participantsSubject.getValue();
    const idx = list.findIndex(p => p.id === participantId);

    if (idx === -1) {
      return { success: false, message: 'Participante no encontrado.' };
    }

    // Clonamos para no mutar el estado directamente
    const p: Participant = { ...list[idx], fishes: [...list[idx].fishes] };
    let result: FishResult;

    if (p.fishes.length < 5) {
      // Caso 1: hay hueco libre
      p.fishes.push(weight);
      p.totalWeight = this.calcTotal(p.fishes);
      result = {
        success: true,
        message: `✅ Pez de ${weight.toFixed(2)} kg añadido. (${p.fishes.length}/5 peces)`
      };
    } else {
      // Caso 2: cupo lleno — aplicar regla de sustitución
      const minWeight = Math.min(...p.fishes);

      if (weight > minWeight) {
        const minIdx = p.fishes.indexOf(minWeight);
        p.fishes[minIdx] = weight;
        p.totalWeight = this.calcTotal(p.fishes);
        result = {
          success: true,
          message: `🔄 Sustitución: ${minWeight.toFixed(2)} kg reemplazado por ${weight.toFixed(2)} kg.`
        };
      } else {
        result = {
          success: false,
          message: `⚠️ El pez (${weight.toFixed(2)} kg) no mejora el pesaje. Mínimo actual: ${minWeight.toFixed(2)} kg.`
        };
      }
    }

    if (result.success) {
      const updated = [...list];
      updated[idx] = p;
      this.participantsSubject.next(updated);
    }

    return result;
  }

  private calcTotal(fishes: number[]): number {
    return parseFloat(fishes.reduce((sum, f) => sum + f, 0).toFixed(2));
  }
}
