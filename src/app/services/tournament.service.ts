import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';

export interface Participant {
  id: number;
  names: string;
  pesquil: number | null;  // null = sin asignar todavía
  fishes: number[];
  awards?: string[];        // premio por cada pez (mismo índice que fishes)
  catchTimes?: string[];    // hora de captura de cada pez (mismo índice que fishes)
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

    // Normalizar: garantizar que awards y catchTimes siempre son arrays
    const normalized = (data ?? []).map((p: any) => ({
      ...p,
      awards: p.awards ?? [],
      catchTimes: p.catchTimes ?? [] // Aseguramos que cargue el array de horas
    }));

    this.zone.run(() => this.participantsSubject.next(normalized));
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

  // ─── Añadir participante (pesquil opcional) ───────────

  async addParticipant(names: string, pesquil: number | null): Promise<void> {
    if (pesquil !== null) {
      const current = this.participantsSubject.getValue();
      if (current.some(p => p.pesquil === pesquil)) {
        throw new Error(`El pesquil número ${pesquil} ya está asignado.`);
      }
    }

    const { error } = await this.supabase
      .from('participants')
      .insert({
        names: names.toUpperCase().trim(),
        pesquil: pesquil ?? null,
        fishes: [],
        awards: [],
        catchTimes: [], // Inicializamos el array de horas vacío
        total_weight: 0
      });

    if (error) throw new Error(error.message);
  }

  // ─── Editar pesquil de un participante ───────────────

  async updatePesquil(participantId: number, pesquil: number): Promise<void> {
    const current = this.participantsSubject.getValue();
    if (current.some(p => p.pesquil === pesquil && p.id !== participantId)) {
      throw new Error(`El pesquil número ${pesquil} ya está asignado a otro participante.`);
    }

    const { error } = await this.supabase
      .from('participants')
      .update({ pesquil })
      .eq('id', participantId);

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
  // Añadimos el parámetro catchTime
  async addFish(participantId: number, weight: number, awardId?: string | null, catchTime?: string | null): Promise<FishResult> {
    const list = this.participantsSubject.getValue();
    const participant = list.find(p => p.id === participantId);

    if (!participant) {
      return { success: false, message: 'Participante no encontrado.' };
    }

    const fishes = [...participant.fishes];
    const awards = participant.awards ? [...participant.awards] : [];
    const catchTimes = participant.catchTimes ? [...participant.catchTimes] : [];
    
    // Fallback de seguridad por si falla la hora que viene del admin
    const defaultTime = catchTime || new Date().toISOString().slice(0, 16);
    
    let result: FishResult;

    if (fishes.length < 5) {
      fishes.push(weight);
      awards.push(awardId || 'NONE');
      catchTimes.push(defaultTime);
      
      result = {
        success: true,
        message: `✅ Pez de ${weight.toFixed(2)} kg añadido. (${fishes.length}/5 peces)`
      };
    } else {
      const minWeight = Math.min(...fishes);
      if (weight > minWeight) {
        const minIdx = fishes.indexOf(minWeight);
        fishes[minIdx] = weight;
        awards[minIdx] = awardId || 'NONE';
        catchTimes[minIdx] = defaultTime; // Sustituimos la hora del pez descartado por la nueva
        
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
      .update({ fishes, awards, catchTimes, total_weight }) // Actualizamos también la base de datos con las horas
      .eq('id', participantId);

    if (error) return { success: false, message: `Error al guardar: ${error.message}` };
    return result;
  }

  // ─── Editar peso de un pez concreto ──────────────────
  // Añadimos el parámetro catchTime
  async editFish(participantId: number, fishIndex: number, newWeight: number, awardId?: string | null, catchTime?: string | null): Promise<FishResult> {
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
    const catchTimes = participant.catchTimes ? [...participant.catchTimes] : [];

    fishes[fishIndex] = newWeight;
    
    // Si no había suficientes premios/horas guardados (por si venían del código antiguo), rellenamos huecos
    while (awards.length <= fishIndex) { awards.push('NONE'); }
    while (catchTimes.length <= fishIndex) { catchTimes.push(new Date().toISOString().slice(0, 16)); }
    
    awards[fishIndex] = awardId || 'NONE';
    
    if (catchTime) {
      catchTimes[fishIndex] = catchTime;
    }

    const total_weight = parseFloat(fishes.reduce((s, f) => s + f, 0).toFixed(2));

    const { error } = await this.supabase
      .from('participants')
      .update({ fishes, awards, catchTimes, total_weight })
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
    const awards = (participant.awards || []).filter((_, i) => i !== fishIndex);
    const catchTimes = (participant.catchTimes || []).filter((_, i) => i !== fishIndex); // Eliminamos la hora también

    const total_weight = parseFloat(fishes.reduce((s, f) => s + f, 0).toFixed(2));

    const { error } = await this.supabase
      .from('participants')
      .update({ fishes, awards, catchTimes, total_weight })
      .eq('id', participantId);

    if (error) return { success: false, message: `Error al guardar: ${error.message}` };

    return {
      success: true,
      message: `🗑️ Pez de ${removedWeight.toFixed(2)} kg eliminado.`
    };
  }
}