import React, { useMemo, useState, useRef } from 'react';
import { TestResult, CategoryNode } from '../types';
import { categoryData } from '../data/categoryTree';
import { QUESTIONS } from '../constants';

interface PathMapProps {
  results: TestResult[];
}

interface Point { x: number; y: number; name: string; children: Point[]; depth: number }

const PathMap: React.FC<PathMapProps> = ({ results }) => {
  // Rozměry "virtuálního" plátna (větší než obrazovka)
  const virtualWidth = 1200;
  const virtualHeight = 1000;
  const centerX = virtualWidth / 2;
  const centerY = virtualHeight / 2;

  // Stavy pro Zoom a Pan
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    const stats: Record<string, { total: number; correct: number; wrong: number; nominated: number }> = {};
    const connections: Record<string, number> = {};

    const init = (node: CategoryNode) => {
      stats[node.name] = { total: 0, correct: 0, wrong: 0, nominated: 0 };
      node.children?.forEach(init);
    };
    init(categoryData);

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
    });

    const points: Point[] = [];
    const layout = (node: CategoryNode, angleStart: number, angleEnd: number, depth: number): Point => {
      const angle = (angleStart + angleEnd) / 2;
      const radius = depth * 150; // Větší rozestupy pro lepší čitelnost
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
    return { points, stats, connections };
  }, [results]);

  // Handlery pro ovládání myší
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(0.5, prev * delta), 3));
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
  };

  return (
    <div 
      className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative h-[750px] cursor-grab active:cursor-grabbing"
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Interaktivní Mapa Průchodů</h3>
        <p className="text-[10px] text-gray-300 mt-1">Kolečko: Zoom • Táhnutí: Posun</p>
      </div>

      <div className="absolute top-6 right-6 z-10 flex gap-2">
        <button onClick={() => {setScale(1); setOffset({x:0, y:0})}} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-xl text-[10px] font-bold uppercase tracking-tight">Reset</button>
      </div>
      
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${virtualWidth} ${virtualHeight}`}
        className="transition-transform duration-75"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        {/* Čáry (spojení) */}
        {data.points.map(p => p.children.map(child => {
          const weight = data.connections[`${p.name}->${child.name}`] || 0;
          if (weight === 0) return null;
          return (
            <line
              key={`${p.name}-${child.name}`}
              x1={p.x} y1={p.y} x2={child.x} y2={child.y}
              stroke="#86EFAC"
              strokeWidth={Math.max(1, weight * 2.5)}
              strokeOpacity="0.4"
            />
          );
        }))}

        {/* Uzly */}
        {data.points.map(p => {
          const s = data.stats[p.name];
          if (!s || s.total === 0) return null;
          const radius = Math.min(30, 10 + s.total * 1.5);
          const correctAngle = (s.correct / s.total) * 360;

          return (
            <g key={p.name} className="cursor-help">
              <circle cx={p.x} cy={p.y} r={radius} fill="#EF4444" />
              <path d={describeArc(p.x, p.y, radius, 0, correctAngle)} fill="#22C55E" />
              <circle cx={p.x} cy={p.y} r={radius} fill="none" stroke="white" strokeWidth="2" />
              <text x={p.x} y={p.y + radius + 15} textAnchor="middle" className="text-[11px] font-black fill-gray-600 uppercase tracking-tighter">
                {p.name}
              </text>
              <title>{`${p.name}\nCelkem průchodů: ${s.total}\nSprávně: ${s.correct}\nZvoleno jako cíl: ${s.nominated}x`}</title>
            </g>
          );
        })}
      </svg>
      
      <div className="absolute bottom-6 left-6 bg-gray-900/90 text-white p-4 rounded-2xl text-[9px] font-bold uppercase tracking-widest space-y-2 pointer-events-none">
        <div className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Správná cesta</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full"></span> Chyba / Návrat</div>
      </div>
    </div>
  );
};

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