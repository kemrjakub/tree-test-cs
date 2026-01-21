import React, { useMemo } from 'react';
import { TestResult, CategoryNode } from '../types';
import { categoryData } from '../data/categoryTree';
import { QUESTIONS } from '../constants';

interface PathMapProps {
  results: TestResult[];
}

interface Point { x: number; y: number; name: string; children: Point[]; depth: number }

const PathMap: React.FC<PathMapProps> = ({ results }) => {
  const width = 800;
  const height = 600;
  const centerX = width / 2;
  const centerY = height / 2;

  const data = useMemo(() => {
    const stats: Record<string, { total: number; correct: number; wrong: number; nominated: number }> = {};
    const connections: Record<string, number> = {};

    // Inicializace statistik
    const init = (node: CategoryNode) => {
      stats[node.name] = { total: 0, correct: 0, wrong: 0, nominated: 0 };
      node.children?.forEach(init);
    };
    init(categoryData);

    // Výpočet statistik z výsledků
    results.forEach(res => {
      const history = res.fullHistory || res.full_history || [];
      const target = QUESTIONS[res.questionIndex]?.target;

      history.forEach((nodeName, i) => {
        if (!stats[nodeName]) return;
        
        stats[nodeName].total++;
        
        // Je tento uzel na správné cestě k cíli? (Zjednodušená logika pro demo)
        if (target && nodeName === target) stats[nodeName].correct++;
        else stats[nodeName].wrong++;

        if (i === history.length - 1) stats[nodeName].nominated++;

        // Sledování spojení (linek)
        if (i > 0) {
          const pair = `${history[i-1]}->${nodeName}`;
          connections[pair] = (connections[pair] || 0) + 1;
        }
      });
    });

    // Výpočet pozic (Radiální rozložení)
    const points: Point[] = [];
    const layout = (node: CategoryNode, angleStart: number, angleEnd: number, depth: number): Point => {
      const angle = (angleStart + angleEnd) / 2;
      const radius = depth * 120;
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

    const rootPoint = layout(categoryData, 0, 2 * Math.PI, 0);
    return { points, stats, connections, rootPoint };
  }, [results]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 overflow-hidden relative h-[700px]">
      <div className="absolute top-6 left-6 z-10">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Interaktivní Mapa Průchodů</h3>
      </div>
      
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        {/* Vykreslení spojnic */}
        {data.points.map(p => p.children.map(child => {
          const weight = data.connections[`${p.name}->${child.name}`] || 0;
          if (weight === 0) return null;
          return (
            <line
              key={`${p.name}-${child.name}`}
              x1={p.x} y1={p.y} x2={child.x} y2={child.y}
              stroke={weight > 0 ? "#86EFAC" : "#E5E7EB"}
              strokeWidth={Math.max(1, weight * 2)}
              strokeOpacity="0.6"
            />
          );
        }))}

        {/* Vykreslení uzlů (Pie charts) */}
        {data.points.map(p => {
          const s = data.stats[p.name];
          if (!s || s.total === 0) return null;

          const radius = Math.min(25, 8 + s.total * 2);
          const correctAngle = (s.correct / s.total) * 360;

          return (
            <g key={p.name} className="cursor-help transition-transform hover:scale-110">
              <circle cx={p.x} cy={p.y} r={radius} fill="#EF4444" /> {/* Wrong path segment */}
              <path
                d={describeArc(p.x, p.y, radius, 0, correctAngle)}
                fill="#22C55E"
              />
              <circle cx={p.x} cy={p.y} r={radius} fill="none" stroke="white" strokeWidth="2" />
              
              <text x={p.x} y={p.y + radius + 12} textAnchor="middle" className="text-[10px] font-bold fill-gray-500">
                {p.name}
              </text>
              <title>{`${p.name}\nPrůchodů: ${s.total}\nZvoleno jako cíl: ${s.nominated}x`}</title>
            </g>
          );
        })}
      </svg>
      
      {/* Legenda */}
      <div className="absolute bottom-6 right-6 bg-gray-900/90 text-white p-4 rounded-2xl text-[9px] font-bold uppercase tracking-widest space-y-2">
        <div className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Správná cesta</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full"></span> Odbočení</div>
        <div className="mt-2 text-gray-500 border-t border-white/10 pt-2">Tloušťka čar = intenzita toku</div>
      </div>
    </div>
  );
};

// Pomocná funkce pro kreslení výsečí koláče v SVG
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number){
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