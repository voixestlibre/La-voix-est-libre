import JSZip from 'jszip';
import { getEventSongsDetails } from './eventsService';
import { getSongFiles } from './songsService';

export async function exportEventAsZip(
  eventId: string,
  eventName: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const songs = await getEventSongsDetails(eventId);

  // Collecter tous les fichiers
  const allFiles: { songTitle: string; fileName: string; url: string }[] = [];
  for (const song of songs) {
    const files = await getSongFiles(song.id, song.title, song.code ?? undefined);
    for (const f of files) {
      allFiles.push({ songTitle: song.title, fileName: f.name, url: f.url });
    }
  }

  // Télécharger et zipper
  let done = 0;
  for (const f of allFiles) {
    try {
      const response = await fetch(f.url);
      const blob = await response.blob();
      // Ranger chaque chant dans un sous-dossier
      const folder = f.songTitle.replace(/[/\\:*?"<>|]/g, '_');
      zip.folder(folder)!.file(f.fileName, blob);
    } catch {}
    done++;
    onProgress?.(done, allFiles.length);
  }

  // Générer un HTML index par chant dans chaque dossier
  for (const song of songs) {
    const files = await getSongFiles(song.id, song.title, song.code ?? undefined);
    const pdfs = files.filter(f => f.name.endsWith('.pdf'));
    const audios = files.filter(f => ['mp3','wav','ogg','m4a'].some(e => f.name.endsWith(e)));
    const folder = song.title.replace(/[/\\:*?"<>|]/g, '_');
    const html = generateSongHtml(song.title, pdfs.map(f => f.name), audios.map(f => f.name));
    zip.folder(folder)!.file('index.html', html);
  }

  // Générer un HTML index de l'événement
  zip.file('index.html', generateEventHtml(eventName, songs));

  // Déclencher le téléchargement
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${eventName.replace(/[/\\:*?"<>|]/g, '_')}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

function generateEventHtml(eventName: string, songs: any[]): string {
  const items = songs.map(s => {
    const folder = s.title.replace(/[/\\:*?"<>|]/g, '_');
    return `<li><a href="${folder}/index.html">${s.title}</a></li>`;
  }).join('\n');
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${eventName}</title>
<style>body{font-family:sans-serif;max-width:600px;margin:2rem auto;padding:1rem}
a{color:#044C8D}li{margin:0.5rem 0}</style></head>
<body><h1>${eventName}</h1><ul>${items}</ul></body></html>`;
}

function generateSongHtml(title: string, pdfs: string[], audios: string[]): string {
  const pdfLinks = pdfs.map(f =>
    `<iframe src="${f}" style="width:100%;height:80vh;border:none;display:block;margin-bottom:1rem"></iframe>`
  ).join('\n');
  const audioLinks = audios.map(f =>
    `<div style="margin:0.5rem 0"><p style="margin:0">${f.replace(/\.[^.]+$/, '')}</p>
     <audio controls src="${f}" style="width:100%"></audio></div>`
  ).join('\n');
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:1rem}
a{color:#044C8D}</style></head>
<body>
<p><a href="../index.html">← Retour</a></p>
<h1>${title}</h1>
${audioLinks}
${pdfLinks}
</body></html>`;
}