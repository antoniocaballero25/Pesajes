import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';

export interface Participant {
  id: number;
  names: string;
  pesquil: number;
  fishes: number[];
  total_weight: number;
}

export interface FishResult {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private participantsSubject = new BehaviorSubject<Participant[]>([]);
  private supabase;

  // Clasificación ordenada de mayor a menor peso total
  readonly leaderboard$: Observable<Participant[]> =
    this.participantsSubject.pipe(
      map(list => [...list].sort((a, b) => b.total_weight - a.total_weight))
    );

  readonly participants$: Observable<Participant[]> =
    this.participantsSubject.asObservable();

  constructor(private sb: SupabaseService, private zone: NgZone) {
    this.supabase = sb.client;
    this.loadAll();
    this.subscribeRealtime();
  }

  // ─── Carga inicial ────────────────────────────────────

  private async loadAll(): Promise<void> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('*')
      .order('total_weight', { ascending: false });

    if (error) { console.error('Error cargando participantes:', error); return; }
    this.zone.run(() => this.participantsSubject.next(data ?? []));
  }

  // ─── Realtime: escucha cambios en la tabla ────────────
  // Cualquier INSERT / UPDATE / DELETE en Supabase se refleja
  // automáticamente en todos los navegadores conectados.

  private subscribeRealtime(): void {
    this.supabase
      .channel('participants-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants' },
        () => {
          // Recargamos la lista completa tras cualquier cambio
          this.loadAll();
        }
      )
      .subscribe();
  }

  // ─── Añadir participante ──────────────────────────────

  async addParticipant(names: string, pesquil: number): Promise<void> {
    // Verificar pesquil duplicado
    const current = this.participantsSubject.getValue();
    if (current.some(p => p.pesquil === pesquil)) {
      throw new Error(`El pesquil número ${pesquil} ya está asignado.`);
    }

    const { error } = await this.supabase
      .from('participants')
      .insert({
        names: names.toUpperCase().trim(),
        pesquil,
        fishes: [],
        total_weight: 0
      });

    if (error) throw new Error(error.message);
  }

  // ─── Eliminar participante ────────────────────────────

  async removeParticipant(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('participants')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  // ─── Añadir pez (regla de los 5 peces) ───────────────

  async addFish(participantId: number, weight: number): Promise<FishResult> {
    const list = this.participantsSubject.getValue();
    const participant = list.find(p => p.id === participantId);

    if (!participant) {
      return { success: false, message: 'Participante no encontrado.' };
    }

    const fishes = [...participant.fishes];
    let result: FishResult;

    if (fishes.length < 5) {
      // Caso 1: hueco libre → añadir directamente
      fishes.push(weight);
      result = {
        success: true,
        message: `✅ Pez de ${weight.toFixed(2)} kg añadido. (${fishes.length}/5 peces)`
      };

    } else {
      // Caso 2: cupo lleno → aplicar regla de sustitución
      const minWeight = Math.min(...fishes);

      if (weight > minWeight) {
        const minIdx = fishes.indexOf(minWeight);
        fishes[minIdx] = weight;
        result = {
          success: true,
          message: `🔄 Sustitución: ${minWeight.toFixed(2)} kg → ${weight.toFixed(2)} kg.`
        };
      } else {
        return {
          success: false,
          message: `⚠️ No mejora. Mínimo actual: ${minWeight.toFixed(2)} kg.`
        };
      }
    }

    // Persistir en Supabase solo si hubo cambio
    const total_weight = parseFloat(
      fishes.reduce((s, f) => s + f, 0).toFixed(2)
    );

    const { error } = await this.supabase
      .from('participants')
      .update({ fishes, total_weight })
      .eq('id', participantId);

    if (error) return { success: false, message: `Error al guardar: ${error.message}` };

    return result;
  }
}