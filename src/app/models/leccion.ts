export interface Leccion {
  // Versión correcta (Frontend - CamelCase)
  idLeccion?: number;
  videoUrl?: string;
  pdfUrl?: string;

  // de respaldo (Backend - SnakeCase)
  // Los ponemos opcionales (?) para que no sean obligatorios al crear
  id_leccion?: number;
  video_url?: string;
  pdf_url?: string;

  // Campos comunes
  titulo: string;
  contenido: string;
  orden: number;
  completada?: boolean;
}
