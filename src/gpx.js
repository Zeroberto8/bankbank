// GPX-Hilfsfunktionen: Parsen und Ausduennen von Wanderweg-Tracks.
// Punkte werden als [lng, lat] gespeichert (gleiche Reihenfolge wie GeoJSON).

// GPX-XML (string) -> Array aus [lng, lat]. Beruecksichtigt Track- (<trkpt>)
// und Routenpunkte (<rtept>). Wirft bei ungueltigem GPX einen Fehler.
export function parseGpx(xmlString) {
  const doc = new DOMParser().parseFromString(xmlString, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("GPX konnte nicht gelesen werden (ungueltiges XML).");

  const nodes = doc.querySelectorAll("trkpt, rtept");
  const points = [];
  nodes.forEach((n) => {
    const lat = parseFloat(n.getAttribute("lat"));
    const lng = parseFloat(n.getAttribute("lon"));
    if (Number.isFinite(lat) && Number.isFinite(lng)) points.push([lng, lat]);
  });

  if (points.length < 2) throw new Error("Keine Trackpunkte in der GPX-Datei gefunden.");
  return points;
}

// Douglas-Peucker-Vereinfachung. tolerance in Grad (~0.0001 entspricht ca. 11 m).
// Reduziert tausende Trackpunkte auf wenige hundert, ohne die Form sichtbar zu
// veraendern – haelt das SVG-Rendering performant.
export function simplify(points, tolerance = 0.0001) {
  if (points.length <= 2) return points;

  const sqTol = tolerance * tolerance;

  const sqSegDist = (p, a, b) => {
    let [x, y] = a;
    let dx = b[0] - x;
    let dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = b[0]; y = b[1];
      } else if (t > 0) {
        x += dx * t; y += dy * t;
      }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };

  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];

  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSq = 0;
    let idx = -1;
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegDist(points[i], points[first], points[last]);
      if (sq > maxSq) { idx = i; maxSq = sq; }
    }
    if (maxSq > sqTol && idx !== -1) {
      keep[idx] = true;
      stack.push([first, idx], [idx, last]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

// Bequeme Kombination: GPX-Text -> ausgeduennte [lng,lat]-Punkte.
// Erhoeht die Toleranz schrittweise, bis hoechstens maxPoints uebrig sind.
export function gpxToPoints(xmlString, maxPoints = 800) {
  const raw = parseGpx(xmlString);
  let tol = 0.00005;
  let pts = simplify(raw, tol);
  while (pts.length > maxPoints && tol < 0.01) {
    tol *= 2;
    pts = simplify(raw, tol);
  }
  return pts;
}
