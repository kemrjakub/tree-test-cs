import React, { useMemo, useState, useRef } from 'react';
import { TestResult, CategoryNode } from '../types';
import { categoryData } from '../data/categoryTree';
import { QUESTIONS } from '../constants';

interface PathMapProps {
  results: TestResult[];
  selectedQuestionIndex?: number | null; // pokud null => vykreslit vše (stará chování)
}

interface Point { x: number; y: number; name: string; children: Point[]; depth: number; angle?: number }

const PathMap: React.FC<PathMapProps> = ({ results, selectedQuestionIndex = null }) => {
  const virtualWidth = 2500;
  const virtualHeight = 2500;
  const centerX = virtualWidth / 2;
  const centerY = virtualHeight / 2;

  const [scale, setScale] = useState(0.8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    // filtrované výsledky: pokud je vybrán index tak jen ty výsledky
    const filteredResults = selectedQuestionIndex == null
      ? results
      : results.filter(r => r.questionIndex === selectedQuestionIndex);

    const stats: Record<string, { total: number; correct: number; wrong: number; nominated: number }> = {};
    const connections: Record<string, number> = {};
    const sequences: Record<string, number> = {};

    const init = (node: CategoryNode) => {
      stats[node.name] = { total: 0, correct: 0, wrong: 0, nominated: 0 };
      node.children?.forEach(init);
    };
    init(categoryData);

    // build stats + count each directed edge occurrence + full sequences for filteredResults
    filteredResults.forEach(res => {
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

    // Determine which nodes are needed: those present in histories + all their ancestors (to keep paths intact)
    const present = new Set<string>();
    Object.entries(stats).forEach(([name, s]) => {
      if (s.total > 0) present.add(name);
    });

    const needed = new Set<string>();
    const markNeeded = (node: CategoryNode): boolean => {
      let self = present.has(node.name);
      let anyChild = false;
      node.children?.forEach(child => {
        if (markNeeded(child)) anyChild = true;
      });
      if (self || anyChild) {
        needed.add(node.name);
        return true;
      }
      return false;
    };
    markNeeded(categoryData);

    // Layout only the needed subtree — compute angular spans proportional to number of needed descendants
    const countNeededDesc = (node: CategoryNode): number => {
      let cnt = needed.has(node.name) ? 1 : 0;
      node.children?.forEach(child => {
        cnt += countNeededDesc(child);
      });
      return cnt;
    };

    const points: Point[] = [];
    const layout = (node: CategoryNode, angleStart: number, angleEnd: number, depth: number): Point | null => {
      if (!needed.has(node.name)) return null;
      const angle = (angleStart + angleEnd) / 2;
      const radius = depth * 180;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const p: Point = { x, y, name: node.name, children: [], depth, angle };
      points.push(p);

      const neededCounts = node.children?.map(child => ({ child, cnt: countNeededDesc(child) })) || [];
      const total = neededCounts.reduce((s, c) => s + c.cnt, 0) || 1;
      let a = angleStart;
      neededCounts.forEach(({ child, cnt }) => {
        if (!needed.has(child.name)) return;
        const span = (angleEnd - angleStart) * (cnt / total);
        const childP = layout(child, a, a + span, depth + 1);
        if (childP) p.children.push(childP);
        a += span;
      });

      return p;
    };

    // if nothing is needed (no data for selected task), fallback: layout root only
    const rootPoint = layout(categoryData, 0, 2 * Math.PI, 0);
    if (!rootPoint && needed.has(categoryData.name)) layout(categoryData, 0, 2 * Math.PI, 0);

    return { points, stats, connections, sequences };
  }, [results, selectedQuestionIndex]);

  // Helper: estimate text width
  const estimateTextWidth = (text: string, fontSize = 12) => {
    const avgChar = fontSize * 0.55;
    return Math.min(300, Math.max(40, text.length * avgChar + 12));
  };

  // map points by name for fast lookup
  const pointByName: Record<string, Point> = {};
  data.points.forEach(p => (pointByName[p.name] = p));

  // labels only for nodes that actually have data in current filtering
  const labels = useMemo(() => {
    type Label = { name: string; x: number; y: number; w: number; h: number; cx: number; cy: number; radius: number; angle?: number };
    const out: Label[] = [];

    data.points.forEach(p => {
      const s = data.stats[p.name];
      if (!s || s.total === 0) return;
      const radius = Math.min(35, 12 + s.total * 2);
      const labelW = estimateTextWidth(p.name, 12);
      const labelH = 18;
      // place label radially outward from node according to p.angle (if present)
      const angle = (p.angle ?? Math.atan2(p.y - virtualHeight / 2, p.x - virtualWidth / 2));
      const dist = radius + 18;
      const cx = p.x + Math.cos(angle) * dist;
      const cy = p.y + Math.sin(angle) * dist;
      out.push({
        name: p.name,
        x: cx - labelW / 2,
        y: cy - labelH / 2,
        w: labelW,
        h: labelH,
        cx: p.x,
        cy: p.y,
        radius,
        angle
      });
    });

    // simple tangential separation per depth-angle buckets
    const buckets: Record<string, Label[]> = {};
    const angleBucketSize = 0.12;
    out.forEach(l => {
      const depth = Math.round(Math.hypot(l.cx - centerX, l.cy - centerY) / 180); // approx depth bucket
      const key = `${depth}-${Math.round((l.angle ?? 0) / angleBucketSize)}`;
      buckets[key] = buckets[key] || [];
      buckets[key].push(l);
    });

    Object.values(buckets).forEach(group => {
      group.sort((a, b) => (a.angle ?? 0) - (b.angle ?? 0));
      const n = group.length;
      if (n <= 1) return;
      group.forEach((l, idx) => {
        const tx = -Math.sin(l.angle ?? 0);
        const ty = Math.cos(l.angle ?? 0);
        const step = l.h + 6;
        const offsetIndex = idx - (n - 1) / 2;
        const tangentialOffset = offsetIndex * step;
        l.x = (l.x + l.w / 2 - l.cx) * 0 + (l.cx + tx * tangentialOffset - l.w / 2); // keep anchored near center but shifted tangentially
        l.y = (l.y + l.h / 2 - l.cy) * 0 + (l.cy + ty * tangentialOffset - l.h / 2);
      });
    });

    return out;
  }, [data]);

  // path helper for parallel curved paths (unchanged)
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
          {/* draw connections */}
          {Object.entries(data.connections).map(([pair, count]) => {
            const [from, to] = pair.split('->');
            const p1 = pointByName[from];
            const p2 = pointByName[to];
            // draw only if both points exist in the pruned layout
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

          {/* highlight most common full sequence if any (kept simple) */}
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

          {/* labels with leader lines (only for nodes that have data for the selected task) */}
          {labels.map(l => {
            const textX = l.x + l.w / 2;
            const textY = l.y + l.h / 2 + 4;
            const nx = textX - l.cx;
            const ny = textY - l.cy;
            const dist = Math.sqrt(nx * nx + ny * ny) || 1;
            const startX = l.cx + (l.radius * nx) / dist;
            const startY = l.cy + (l.radius * ny) / dist;
            return (
              <g key={`label-${l.name}`}>
                <line x1={startX} y1={startY} x2={textX} y2={textY - 6} stroke="rgba(120,120,120,0.35)" strokeWidth={1} />
                <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={8} fill="rgba(255,255,255,0.96)" stroke="rgba(0,0,0,0.06)" />
                <text x={textX} y={textY} textAnchor="middle" className="text-[11px] font-black fill-gray-800 uppercase tracking-tighter" style={{ pointerEvents: 'none' }}>
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