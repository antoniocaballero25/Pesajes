import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';

export interface Participant {
  id: number;
  names: string;
  pesquil: number;
  fishes: number[];
  awards?: string[]; // NUEVA COLUMNA PARA LOS PREMIOS
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

  private subscribeRealtime(): void {
    this.supabase
      .channel('participants-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants' },
        () => this.loadAll()
      )
      .subscribe();
  }

  // ─── Añadir participante ──────────────────────────────

  async addParticipant(names: string, pesquil: number): Promise<void> {
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
        awards: [], // Se inicializa vacío
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

  async addFish(participantId: number, weight: number, awardId?: string | null): Promise<FishResult> {
    const list = this.participantsSubject.getValue();
    const participant = list.find(p => p.id === participantId);

    if (!participant) {
      return { success: false, message: 'Participante no encontrado.' };
    }

    const fishes = [...participant.fishes];
    const awards = participant.awards ? [...participant.awards] : [];
    let result: FishResult;

    if (fishes.length < 5) {
      fishes.push(weight);
      awards.push(awardId || 'NONE'); // Se añade el premio al mismo índice
      result = {
        success: true,
        message: `✅ Pez de ${weight.toFixed(2)} kg añadido. (${fishes.length}/5 peces)`
      };
    } else {
      const minWeight = Math.min(...fishes);
      if (weight > minWeight) {
        const minIdx = fishes.indexOf(minWeight);
        fishes[minIdx] = weight;
        awards[minIdx] = awardId || 'NONE'; // Se reemplaza el premio también
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

    const total_weight = parseFloat(fishes.reduce((s, f) => s + f, 0).toFixed(2));
    const { error } = await this.supabase
      .from('participants')
      .update({ fishes, awards, total_weight }) // Actualizamos ambos arrays
      .eq('id', participantId);

    if (error) return { success: false, message: `Error al guardar: ${error.message}` };
    return result;
  }

  // ─── Editar peso de un pez concreto ──────────────────

  async editFish(participantId: number, fishIndex: number, newWeight: number, awardId?: string | null): Promise<FishResult> {
    const list = this.participantsSubject.getValue();
    const participant = list.find(p => p.id === participantId);

    if (!participant) {
      return { success: false, message: 'Participante no encontrado.' };
    }

    if (fishIndex < 0 || fishIndex >= participant.fishes.length) {
      return { success: false, message: 'Índice de pez no válido.' };
    }

    const oldWeight = participant.fishes[fishIndex];
    const fishes = [...participant.fishes];
    const awards = participant.awards ? [...participant.awards] : [];
    
    fishes[fishIndex] = newWeight;
    // Si no había suficientes premios guardados, rellenamos con 'NONE' hasta alcanzar el índice
    while (awards.length <= fishIndex) { awards.push('NONE'); }
    awards[fishIndex] = awardId || 'NONE';

    const total_weight = parseFloat(fishes.reduce((s, f) => s + f, 0).toFixed(2));

    const { error } = await this.supabase
      .from('participants')
      .update({ fishes, awards, total_weight })
      .eq('id', participantId);

    if (error) return { success: false, message: `Error al guardar: ${error.message}` };

    return {
      success: true,
      message: `✏️ Pez ${fishIndex + 1} corregido: ${oldWeight.toFixed(2)} kg → ${newWeight.toFixed(2)} kg.`
    };
  }

  // ─── Eliminar un pez concreto ─────────────────────────

  async deleteFish(participantId: number, fishIndex: number): Promise<FishResult> {
    const list = this.participantsSubject.getValue();
    const participant = list.find(p => p.id === participantId);

    if (!participant) {
      return { success: false, message: 'Participante no encontrado.' };
    }

    const removedWeight = participant.fishes[fishIndex];
    const fishes = participant.fishes.filter((_, i) => i !== fishIndex);
    const awards = (participant.awards || []).filter((_, i) => i !== fishIndex); // Eliminamos su premio correspondiente
    const total_weight = parseFloat(fishes.reduce((s, f) => s + f, 0).toFixed(2));

    const { error } = await this.supabase
      .from('participants')
      .update({ fishes, awards, total_weight })
      .eq('id', participantId);

    if (error) return { success: false, message: `Error al guardar: ${error.message}` };

    return {
      success: true,
      message: `🗑️ Pez de ${removedWeight.toFixed(2)} kg eliminado.`
    };
  }
}