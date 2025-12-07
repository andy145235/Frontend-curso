import {Modulo} from './modulo';

export interface Course {
  // En Java es "private Long idCurso;"
  idCurso?: number;

  // En Java "private String titulo;"
  titulo: string;

  // En Java "private String descripcion;"
  descripcion: string;

  // En Java "private String categoria;"
  categoria: string;

  // En Java "private String nivel;"
  nivel: string;

  // En Java "private String estado;"
  estado: string;

  // En Java "private LocalDateTime fechaCreacion;"
  // Angular recibe las fechas como String ISO (ej: "2025-11-27T10:00:00")
  fechaCreacion?: string;

  modulos?: Modulo[];

  cuposMaximos?: number;
  inscritosActuales?: number;
  yaInscrito?: boolean;

  instructor?: string;


}
