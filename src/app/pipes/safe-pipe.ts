import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
@Pipe({
  name: 'safe',
  standalone: true // ¡Importante para que funcione en tu App Standalone!
})
export class SafePipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string): SafeResourceUrl {
    if (!url) return '';

    // Lógica para convertir link de YouTube normal a Embed
    // De: https://www.youtube.com/watch?v=dQw4w9WgXcQ
    // A:   https://www.youtube.com/embed/dQw4w9WgXcQ
    let videoId = '';

    if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0]; // Toma el ID y quita params extra
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1];
    }

    const finalUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : url;

    return this.sanitizer.bypassSecurityTrustResourceUrl(finalUrl);
  }
}
