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
    return { points, stats, connections };
  }, [results]);

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
          {data.points.map(p => p.children.map(child => {
            const weight = data.connections[`${p.name}->${child.name}`] || 0;
            if (weight === 0) return null;
            return (
              <line
                key={`${p.name}-${child.name}`}
                x1={p.x} y1={p.y} x2={child.x} y2={child.y}
                stroke="#86EFAC"
                strokeWidth={Math.max(1.5, weight * 3)}
                strokeOpacity="0.3"
              />
            );
          }))}

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
                
                <text 
                    x={p.x} 
                    y={p.y + radius + 18} 
                    textAnchor="middle" 
                    className="text-[12px] font-black fill-gray-800 uppercase tracking-tighter shadow-sm"
                    style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: '3px', strokeLinecap: 'round' }}
                >
                  {p.name}
                </text>
                
                <title>{`${p.name}\n---\nPrůchodů celkem: ${s.total}\nSprávná cesta: ${s.correct}\nChybná cesta: ${s.total - s.correct}\nZvoleno jako cíl: ${s.nominated}x`}</title>
              </g>
            );
          })}
        </svg>
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