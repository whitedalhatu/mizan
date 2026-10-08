// Builds an extended M3U playlist from scheduled entries. RadioBOSS reads M3U for
// playback; #EXTINF carries the title, and we add a timing comment per entry so
// the play order and intended times are explicit.
export function buildM3U(entries: { time: string; filename: string }[]): string {
  const lines: string[] = ["#EXTM3U"];
  for (const e of entries) {
    // #EXTINF:duration,title — duration unknown here, use -1; title = filename.
    lines.push(`#EXTINF:-1,${e.filename}`);
    if (e.time) lines.push(`#EXT-X-SCHEDULED-TIME:${e.time}`);
    lines.push(e.filename);
  }
  return lines.join("\r\n") + "\r\n";
}
