import React, { useMemo, useState, useRef } from 'react';
import { TestResult, CategoryNode } from '../types';
import { categoryData } from '../data/categoryTree';
import { QUESTIONS } from '../constants';

interface PathMapProps {
  results: TestResult[];
}

interface Point { x: number; y: number; name: string; children: Point[]; depth: number }

const PathMap: React.FC<PathMapProps> = ({ results }) => {
  const virtualWidth = 2500;
  const virtualHeight = 2500;
  const centerX = virtualWidth / 2;
  const centerY = virtualHeight / 2;

  const [scale, setScale] = useState(0.8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    const stats: Record<string, { total: number; correct: number; wrong: number; nominated: number }> = {};
    const connections: Record<string, number> = {};
    const sequences: Record<string, number> = {};

    const init = (node: CategoryNode) => {
      stats[node.name] = { total: 0, correct: 0, wrong: 0, nominated: 0 };
      node.children?.forEach(init);
    };
    init(categoryData);

    // build stats + count each directed edge occurrence + full sequences
    results.forEach(res => {
      const history = res.fullHistory || res.full_history || [];
      const target = QUESTIONS[res.questionIndex]?.target;

      history.forEach((nodeName, i) => {
        if (!stats[nodeName]) return;
        stats[nodeName].total++;
        if (target && nodeName === target) stats[nodeName].correct++;
        else stats[nodeName].wrong++;
        if (i === history.length - 1) stats[nodeName].nominated++;
        if (i > 0) {
          const pair = `${history[i-1]}->${nodeName}`;
          connections[pair] = (connections[pair] || 0) + 1;
        }
      });

      if (history.length > 1) {
        const key = history.join('->');
        sequences[key] = (sequences[key] || 0) + 1;
      }
    });

    const points: Point[] = [];
    const layout = (node: CategoryNode, angleStart: number, angleEnd: number, depth: number): Point => {
      const angle = (angleStart + angleEnd) / 2;
      const radius = depth * 180;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const p: Point = { x, y, name: node.name, children: [], depth };
      points.push(p);

      if (node.children) {
        const step = (angleEnd - angleStart) / node.children.length;
        node.children.forEach((child, i) => {
          p.children.push(layout(child, angleStart + i * step, angleStart + (i + 1) * step, depth + 1));
        });
      }
      return p;
    };

    layout(categoryData, 0, 2 * Math.PI, 0);

    // find most common full sequence
    let mostCommonSequence: string | null = null;
    let maxSeq = 0;
    Object.entries(sequences).forEach(([k, v]) => {
      if (v > maxSeq) {
        maxSeq = v;
        mostCommonSequence = k;
      }
    });

    return { points, stats, connections, sequences, mostCommonSequence };
  }, [results]);

  // small helper to estimate text width
  const estimateTextWidth = (text: string, fontSize = 12) => {
    const avgChar = fontSize * 0.55;
    return Math.min(300, Math.max(40, text.length * avgChar + 12));
  };

  // compute labels + simple collision resolution (iterative)
  const labels = useMemo(() => {
    type Label = {
      name: string;
      x: number;
      y: number;
      w: number;
      h: number;
      cx: number; // node center x
      cy: number; // node center y
      radius: number;
    };

    const out: Label[] = data.points.map(p => {
      const s = data.stats[p.name] || { total: 0, correct: 0, wrong: 0, nominated: 0 };
      const radius = Math.min(35, 12 + s.total * 2);
      const labelW = estimateTextWidth(p.name, 12);
      const labelH = 18;
      const lx = p.x - labelW / 2;
      const ly = p.y + radius + 10; // below node
      return {
        name: p.name,
        x: lx,
        y: ly,
        w: labelW,
        h: labelH,
        cx: p.x,
        cy: p.y,
        radius
      };
    });

    // iterative repulsion to reduce overlaps
    const steps = 8;
    for (let step = 0; step < steps; step++) {
      for (let i = 0; i < out.length; i++) {
        for (let j = i + 1; j < out.length; j++) {
          const a = out[i];
          const b = out[j];
          // check bbox overlap
          if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
            // compute push vector from center-to-center of labels
            const ax = a.x + a.w / 2;
            const ay = a.y + a.h / 2;
            const bx = b.x + b.w / 2;
            const by = b.y + b.h / 2;
            let dx = ax - bx;
            let dy = ay - by;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            dx /= dist;
            dy /= dist;
            const overlapX = Math.max(0, (a.w + b.w) / 2 - Math.abs(ax - bx));
            const overlapY = Math.max(0, (a.h + b.h) / 2 - Math.abs(ay - by));
            const push = Math.max(overlapX, overlapY) * 0.55;
            // move both labels slightly apart, but keep them roughly anchored radially
            a.x += dx * push * 0.6;
            a.y += dy * push * 0.6;
            b.x -= dx * push * 0.6;
            b.y -= dy * push * 0.6;
          }
        }
      }

      // also avoid labels overlapping their own node circle (push label outward along radial from node)
      out.forEach(l => {
        const labelTop = l.y;
        const dx = (l.x + l.w / 2) - l.cx;
        const dy = (l.y + l.h / 2) - l.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = l.radius + 8 + Math.max(l.h / 2, 0);
        if (dist < minDist) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          const needed = minDist - dist;
          l.x += nx * needed;
          l.y += ny * needed;
        }
        // clamp label distance so they don't go far away
        const relDx = l.x + l.w / 2 - l.cx;
        const relDy = l.y + l.h / 2 - l.cy;
        const maxDist = 220;
        const curDist = Math.sqrt(relDx * relDx + relDy * relDy);
        if (curDist > maxDist) {
          const nx = relDx / curDist;
          const ny = relDy / curDist;
          const cx = l.cx + nx * maxDist - l.w / 2;
          const cy = l.cy + ny * maxDist - l.h / 2;
          l.x = cx;
          l.y = cy;
        }
      });
    }

    return out;
  }, [data]);

  // Helpers for curved parallel paths (unchanged)
  const makeCurvePath = (x1: number, y1: number, x2: number, y2: number, index: number, total: number) => {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // normalized perpendicular
    const nx = -dy / len;
    const ny = dx / len;

    // spacing: wider when more parallel paths, but clamp
    const baseSpacing = 8; // px per step
    const spreadFactor = Math.min(1.5, 1 + total / 10);
    const offset = (index - (total - 1) / 2) * baseSpacing * spreadFactor;

    const controlX = midX + nx * offset;
    const controlY = midY + ny * offset;

    return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prev => Math.min(Math.max(0.2, prev * delta), 4));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
  };

  const resetView = () => {
    setScale(0.8);
    setOffset({ x: 0, y: 0 });
  };

  // map points by name for fast lookup
  const pointByName: Record<string, Point> = {};
  data.points.forEach(p => (pointByName[p.name] = p));

  return (
    <div
      className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative h-[800px] cursor-grab active:cursor-grabbing select-none"
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
    >
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Interaktivní Flow Mapa</h3>
        <p className="text-[9px] text-gray-300 mt-1 font-bold">TAŽENÍ: Posun • CTRL+KOLEČKO: Zoom</p>
      </div>

      <div className="absolute top-6 right-6 z-20 flex gap-2">
        <button onClick={resetView} className="bg-white border border-gray-100 hover:bg-gray-50 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95">
          Vycentrovat
        </button>
      </div>

      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        <svg
          width={virtualWidth}
          height={virtualHeight}
          viewBox={`0 0 ${virtualWidth} ${virtualHeight}`}
          style={{ overflow: 'visible' }}
        >
          {/* connections */}
          {Object.entries(data.connections).map(([pair, count]) => {
            const [from, to] = pair.split('->');
            const p1 = pointByName[from];
            const p2 = pointByName[to];
            if (!p1 || !p2 || count <= 0) return null;

            return [...Array(count)].map((_, i) => {
              const pathD = makeCurvePath(p1.x, p1.y, p2.x, p2.y, i, count);
              const sw = Math.max(1, Math.min(2.5, 2.5 / Math.sqrt(count)));
              const opacity = 0.22 + Math.min(0.6, count * 0.03);
              return (
                <path
                  key={`${pair}-${i}`}
                  d={pathD}
                  fill="none"
                  stroke="#86EFAC"
                  strokeWidth={sw}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                />
              );
            });
          })}

          {/* Highlight most common full sequence (if any) */}
          {data.mostCommonSequence ? (() => {
            const seq = data.mostCommonSequence!;
            const seqParts = seq.split('->');
            const seqCount = (data as any).sequences?.[seq] || 1;
            return seqParts.slice(1).map((to, idx) => {
              const from = seqParts[idx];
              const p1 = pointByName[from];
              const p2 = pointByName[to];
              if (!p1 || !p2) return null;
              const pairKey = `${from}->${to}`;
              const pairCount = data.connections[pairKey] || 1;
              return [...Array(Math.min(pairCount, 3))].map((_, i) => {
                const pathD = makeCurvePath(p1.x, p1.y, p2.x, p2.y, i, Math.max(1, pairCount));
                const sw = 3 + Math.log(seqCount + 1);
                return (
                  <path
                    key={`seq-highlight-${pairKey}-${i}`}
                    d={pathD}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={sw}
                    strokeOpacity={0.95}
                    strokeLinecap="round"
                  />
                );
              });
            });
          })() : null}

          {/* nodes */}
          {data.points.map(p => {
            const s = data.stats[p.name];
            if (!s || s.total === 0) return null;
            const radius = Math.min(35, 12 + s.total * 2);
            const correctAngle = (s.correct / s.total) * 360;
            return (
              <g key={p.name} className="cursor-help">
                <circle cx={p.x} cy={p.y} r={radius} fill="#FCA5A5" />
                <path d={describeArc(p.x, p.y, radius, 0, correctAngle)} fill="#4ADE80" />
                <circle cx={p.x} cy={p.y} r={radius} fill="none" stroke="white" strokeWidth="2.5" />
                <title>{`${p.name}\n---\nPrůchodů celkem: ${s.total}\nSprávná cesta: ${s.correct}\nChybná cesta: ${s.total - s.correct}\nZvoleno jako cíl: ${s.nominated}x`}</title>
              </g>
            );
          })}

          {/* labels with leader lines */}
          {labels.map((l) => {
            const textX = l.x + l.w / 2;
            const textY = l.y + l.h / 2 + 4;
            // leader line from node edge to label rect center
            const nx = textX - l.cx;
            const ny = textY - l.cy;
            const dist = Math.sqrt(nx * nx + ny * ny) || 1;
            const startX = l.cx + (l.radius * nx) / dist;
            const startY = l.cy + (l.radius * ny) / dist;
            const endX = textX;
            const endY = textY - 6; // small offset to rect top center
            return (
              <g key={`label-${l.name}`}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="rgba(120,120,120,0.35)"
                  strokeWidth={1}
                />
                <rect
                  x={l.x}
                  y={l.y}
                  width={l.w}
                  height={l.h}
                  rx={8}
                  fill="rgba(255,255,255,0.96)"
                  stroke="rgba(0,0,0,0.06)"
                />
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  className="text-[11px] font-black fill-gray-800 uppercase tracking-tighter"
                  style={{ pointerEvents: 'none' }}
                >
                  {l.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", x, y, "L", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y, "L", x, y, "Z"].join(" ");
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return { x: centerX + (radius * Math.cos(angleInRadians)), y: centerY + (radius * Math.sin(angleInRadians)) };
}

export default PathMap;