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

  // compute labels: only for nodes with data; place radially and distribute tangentially within depth-group/angle clusters
  const labels = useMemo(() => {
    type Label = {
      name: string;
      x: number;
      y: number;
      w: number;
      h: number;
      cx: number;
      cy: number;
      radius: number;
      angle: number;
      depth: number;
      centerX: number;
      centerY: number;
    };

    const raw: Label[] = data.points.map(p => {
      const s = data.stats[p.name] || { total: 0, correct: 0, wrong: 0, nominated: 0 };
      if (!s.total) return null; // skip irrelevant nodes
      const radius = Math.min(35, 12 + s.total * 2);
      const angle = Math.atan2(p.y - centerY, p.x - centerX); // radians
      // initial label center placed radially outward
      const distFromNode = radius + 18;
      const centerXpos = p.x + Math.cos(angle) * distFromNode;
      const centerYpos = p.y + Math.sin(angle) * distFromNode;
      const labelW = estimateTextWidth(p.name, 12);
      const labelH = 18;
      return {
        name: p.name,
        x: centerXpos - labelW / 2,
        y: centerYpos - labelH / 2,
        w: labelW,
        h: labelH,
        cx: p.x,
        cy: p.y,
        radius,
        angle,
        depth: p.depth,
        centerX: centerXpos,
        centerY: centerYpos
      } as Label;
    }).filter(Boolean) as Label[];

    // group by depth then by rounded angle bucket to separate close-by labels tangentially
    const buckets: Record<string, Label[]> = {};
    const angleBucketSize = 0.12; // ~7 degrees
    raw.forEach(l => {
      const key = `${l.depth}-${Math.round(l.angle / angleBucketSize)}`;
      buckets[key] = buckets[key] || [];
      buckets[key].push(l);
    });

    Object.values(buckets).forEach(group => {
      group.sort((a, b) => a.angle - b.angle);
      const n = group.length;
      if (n <= 1) return;
      // tangent vector for offset: tx, ty
      group.forEach((l, idx) => {
        const tx = -Math.sin(l.angle);
        const ty = Math.cos(l.angle);
        const step = l.h + 6; // spacing between stacked labels
        const offsetIndex = idx - (n - 1) / 2;
        const tangentialOffset = offsetIndex * step;
        l.x = l.centerX - l.w / 2 + tx * tangentialOffset;
        l.y = l.centerY - l.h / 2 + ty * tangentialOffset;
        // clamp distance to node
        const relX = (l.x + l.w / 2) - l.cx;
        const relY = (l.y + l.h / 2) - l.cy;
        const curDist = Math.sqrt(relX * relX + relY * relY);
        const maxDist = 140;
        if (curDist > maxDist) {
          const nx = relX / curDist;
          const ny = relY / curDist;
          const cx = l.cx + nx * maxDist - l.w / 2;
          const cy = l.cy + ny * maxDist - l.h / 2;
          l.x = cx;
          l.y = cy;
        }
      });
    });

    return raw;
  }, [data]);

  // Helpers for curved parallel paths
  const makeCurvePath = (x1: number, y1: number, x2: number, y2: number, index: number, total: number) => {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const baseSpacing = 8;
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