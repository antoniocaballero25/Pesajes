import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';

export interface Participant {
  id: number;
  names: string;
  pesquil: number | null;
  fishes: number[];
  awards?: string[];
  catchTimes?: string[];
  photoUrls?: string[]; // ← Novedad: El array para guardar los enlaces de las fotos
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

  readonly leaderboard$: Observable<Participant[]> = this.participantsSubject.pipe(
    map(list => [...list].sort((a, b) => b.total_weight - a.total_weight))
  );

  readonly participants$: Observable<Participant[]> = this.participantsSubject.asObservable();

  constructor(private sb: SupabaseService, private zone: NgZone) {
    this.supabase = sb.client;
    this.loadAll();
    this.subscribeRealtime();
  }

  private async loadAll(): Promise<void> {
    const { data, error } = await this.supabase
      .from('participants').select('*').order('total_weight', { ascending: false });

    if (error) { console.error('Error cargando participantes:', error); return; }

    const normalized = (data ?? []).map((p: any) => ({
      ...p,
      awards: p.awards ?? [],
      catchTimes: p.catchTimes ?? [],
      photoUrls: p.photoUrls ?? [] // ← Normalizamos el array de fotos
    }));

    this.zone.run(() => this.participantsSubject.next(normalized));
  }

  private subscribeRealtime(): void {
    this.supabase.channel('participants-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => this.loadAll())
      .subscribe();
  }

  async addParticipant(names: string, pesquil: number | null): Promise<void> {
    if (pesquil !== null) {
      const current = this.participantsSubject.getValue();
      if (current.some(p => p.pesquil === pesquil)) throw new Error(`El pesquil número ${pesquil} ya está asignado.`);
    }

    const { error } = await this.supabase.from('participants').insert({
      names: names.toUpperCase().trim(),
      pesquil: pesquil ?? null,
      fishes: [], awards: [], catchTimes: [], photoUrls: [], total_weight: 0
    });

    if (error) throw new Error(error.message);
  }

  async updatePesquil(participantId: number, pesquil: number): Promise<void> {
    const current = this.participantsSubject.getValue();
    if (current.some(p => p.pesquil === pesquil && p.id !== participantId)) {
      throw new Error(`El pesquil ${pesquil} ya es de otro participante.`);
    }
    const { error } = await this.supabase.from('participants').update({ pesquil }).eq('id', participantId);
    if (error) throw new Error(error.message);
  }

  async removeParticipant(id: number): Promise<void> {
    const { error } = await this.supabase.from('participants').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ─── NUEVO: Subir foto al Storage ───
  async uploadPhoto(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('capturas')
      .upload(filePath, file);

    if (uploadError) throw new Error(uploadError.message);

    const { data } = this.supabase.storage.from('capturas').getPublicUrl(filePath);
    return data.publicUrl;
  }

  // ─── Añadir pez ───
  async addFish(participantId: number, weight: number, awardId?: string | null, catchTime?: string | null, photoUrl?: string | null): Promise<FishResult> {
    const list = this.participantsSubject.getValue();
    const participant = list.find(p => p.id === participantId);
    if (!participant) return { success: false, message: 'Participante no encontrado.' };

    const fishes = [...participant.fishes];
    const awards = participant.awards ? [...participant.awards] : [];
    const catchTimes = participant.catchTimes ? [...participant.catchTimes] : [];
    const photoUrls = participant.photoUrls ? [...participant.photoUrls] : [];
    
    const defaultTime = catchTime || new Date().toISOString().slice(0, 16);
    let result: FishResult;

    if (fishes.length < 5) {
      fishes.push(weight);
      awards.push(awardId || 'NONE');
      catchTimes.push(defaultTime);
      photoUrls.push(photoUrl || ''); // ← Metemos la URL o vacío
      result = { success: true, message: `✅ Pez de ${weight.toFixed(2)} kg añadido.` };
    } else {
      const minWeight = Math.min(...fishes);
      if (weight > minWeight) {
        const minIdx = fishes.indexOf(minWeight);
        fishes[minIdx] = weight;
        awards[minIdx] = awardId || 'NONE';
        catchTimes[minIdx] = defaultTime;
        photoUrls[minIdx] = photoUrl || ''; // ← Sustituimos foto si mejora
        result = { success: true, message: `🔄 Sustitución: ${minWeight.toFixed(2)} kg → ${weight.toFixed(2)} kg.` };
      } else {
        return { success: false, message: `⚠️ No mejora. Mínimo actual: ${minWeight.toFixed(2)} kg.` };
      }
    }

    const total_weight = parseFloat(fishes.reduce((s, f) => s + f, 0).toFixed(2));
    const { error } = await this.supabase.from('participants')
      .update({ fishes, awards, catchTimes, photoUrls, total_weight }).eq('id', participantId);

    if (error) return { success: false, message: `Error al guardar: ${error.message}` };
    return result;
  }

  async editFish(participantId: number, fishIndex: number, newWeight: number, awardId?: string | null, catchTime?: string | null, photoUrl?: string | null): Promise<FishResult> {
    const list = this.participantsSubject.getValue();
    const participant = list.find(p => p.id === participantId);
    if (!participant) return { success: false, message: 'Participante no encontrado.' };

    const fishes = [...participant.fishes];
    const awards = participant.awards ? [...participant.awards] : [];
    const catchTimes = participant.catchTimes ? [...participant.catchTimes] : [];
    const photoUrls = participant.photoUrls ? [...participant.photoUrls] : [];

    fishes[fishIndex] = newWeight;
    while (awards.length <= fishIndex) awards.push('NONE');
    while (catchTimes.length <= fishIndex) catchTimes.push(new Date().toISOString().slice(0, 16));
    while (photoUrls.length <= fishIndex) photoUrls.push('');

    awards[fishIndex] = awardId || 'NONE';
    if (catchTime) catchTimes[fishIndex] = catchTime;
    if (photoUrl) photoUrls[fishIndex] = photoUrl; // Solo sustituye si hay nueva foto

    const total_weight = parseFloat(fishes.reduce((s, f) => s + f, 0).toFixed(2));
    const { error } = await this.supabase.from('participants')
      .update({ fishes, awards, catchTimes, photoUrls, total_weight }).eq('id', participantId);

    if (error) return { success: false, message: `Error al guardar: ${error.message}` };
    return { success: true, message: `✏️ Pez corregido a ${newWeight.toFixed(2)} kg.` };
  }

  async deleteFish(participantId: number, fishIndex: number): Promise<FishResult> {
    const list = this.participantsSubject.getValue();
    const participant = list.find(p => p.id === participantId);
    if (!participant) return { success: false, message: 'Participante no encontrado.' };

    const fishes = participant.fishes.filter((_, i) => i !== fishIndex);
    const awards = (participant.awards || []).filter((_, i) => i !== fishIndex);
    const catchTimes = (participant.catchTimes || []).filter((_, i) => i !== fishIndex);
    const photoUrls = (participant.photoUrls || []).filter((_, i) => i !== fishIndex);

    const total_weight = parseFloat(fishes.reduce((s, f) => s + f, 0).toFixed(2));
    const { error } = await this.supabase.from('participants')
      .update({ fishes, awards, catchTimes, photoUrls, total_weight }).eq('id', participantId);

    if (error) return { success: false, message: `Error al guardar: ${error.message}` };
    return { success: true, message: `🗑️ Pez eliminado.` };
  }
}