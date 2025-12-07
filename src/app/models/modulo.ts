import { Leccion } from './leccion';

export interface Modulo {
  idModulo?: number;
  titulo: string;
  descripcion: string;
  orden: number;
  lecciones: Leccion[]; // Lista de lecciones dentro del módulo
  isOpen?: boolean;

}
