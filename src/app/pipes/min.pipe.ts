import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe auxiliar para calcular el mínimo de un array en la plantilla.
 * Uso: {{ [3.5, 2.1, 4.0] | min }}  →  2.10
 */
@Pipe({ name: 'min' })
export class MinPipe implements PipeTransform {
  transform(values: number[]): string {
    if (!values || values.length === 0) return '0.00';
    return Math.min(...values).toFixed(2);
  }
}
