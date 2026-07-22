export function parseCloudTalkPaste(text) {
  const lines = (text || "").split(/\r?\n/);
  const entries = [];
  const seen = new Set();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let cells = trimmed.split("\t").map((c) => c.trim());
    while (cells.length && cells[cells.length - 1] === "") cells.pop();
    if (cells.length < 2) continue;
    const name = cells[0];
    if (!name || /^\d+$/.test(name)) continue; // ligne de pagination ("1", "2", "3"...)
    if (name.toLowerCase() === "name") continue; // ligne d'en-tete
    const remainingRaw = (cells[1] || "").replace(/[^\d]/g, "");
    if (!remainingRaw) continue;
    const remaining = parseInt(remainingRaw, 10);
    if (Number.isNaN(remaining)) continue;
    const key = name + "|" + remaining;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ name, remaining });
  }
  return entries;
}
