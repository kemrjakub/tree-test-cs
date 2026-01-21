import React, { useMemo } from 'react';
import { TestResult, CategoryNode } from '../types';
import { categoryData } from '../data/categoryTree';

interface TreeDiagramProps {
  results: TestResult[];
  targetNodeName?: string;
}

const TreeDiagram: React.FC<TreeDiagramProps> = ({ results }) => {
  const { stats, topNodes } = useMemo(() => {
    const nodeStats: Record<string, { total: number; nominated: number }> = {};
    
    const initStats = (node: CategoryNode) => {
      nodeStats[node.name] = { total: 0, nominated: 0 };
      node.children?.forEach(initStats);
    };
    initStats(categoryData);

    results.forEach(res => {
      res.fullHistory?.forEach((name, index) => {
        if (nodeStats[name]) {
          nodeStats[name].total++;
          if (index === res.fullHistory!.length - 1) {
            nodeStats[name].nominated++;
          }
        }
      });
    });

    const visited = Object.entries(nodeStats)
      .filter(([_, s]) => s.total > 0)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => {
        // ŘAZENÍ: Priorita 1 - Celkový počet kliknutí (nejnavštěvovanější nahoře)
        if (b.total !== a.total) {
          return b.total - a.total;
        }
        // Priorita 2 - Pokud je shoda, dej výš ty, které byly zvoleny jako cíl
        return b.nominated - a.nominated;
      });

    return { stats: nodeStats, topNodes: visited };
  }, [results]);

  const RenderNode = ({ node, depth = 0 }: { node: CategoryNode; depth: number }) => {
    const s = stats[node.name];
    const hasInteractions = s && s.total > 0;

    return (
      <div className="flex flex-col">
        <div 
          className={`flex items-center py-2 px-4 border-b border-gray-50 ${hasInteractions ? 'bg-blue-50/30' : ''}`}
          style={{ paddingLeft: `${(depth * 20) + 16}px` }}
        >
          <span className="text-gray-300 mr-2 font-mono">└</span>
          <span className={`text-sm ${hasInteractions ? 'font-semibold text-blue-700' : 'text-gray-400 font-normal'}`}>
            {node.name}
          </span>
          {hasInteractions && (
            <span className="ml-auto text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">
              {s.total}×
            </span>
          )}
        </div>
        {node.children?.map(child => (
          <RenderNode key={child.name} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col h-[700px] shadow-sm">
      <div className="p-6 bg-gray-50 border-b border-gray-200 shrink-0">
        <h3 className="font-semibold text-gray-800 tracking-wider text-sm uppercase">
          Analýza průchodu strukturou
        </h3>
      </div>
      
      <div className="overflow-y-auto flex-grow bg-white">
        {topNodes.length > 0 ? (
          <div className="p-6 bg-blue-50/50 border-b border-blue-100">
            <h4 className="text-[11px] font-semibold text-blue-800 mb-4 tracking-widest flex items-center gap-2 uppercase">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              Nejnavštěvovanější kategorie (Top)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {topNodes.map((node) => (
                <div 
                  key={node.name} 
                  className={`bg-white p-3 rounded-2xl border shadow-sm flex justify-between items-center transition-all hover:scale-[1.02] ${
                    node.nominated > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-blue-100'
                  }`}
                >
                  <div className="overflow-hidden mr-2">
                    <div className="text-xs font-semibold text-gray-800 truncate" title={node.name}>
                      {node.name}
                    </div>
                    <div className="text-[10px] text-blue-500 font-medium">
                      Celkem kliků: {node.total}
                    </div>
                  </div>
                  {node.nominated > 0 && (
                    <div className="bg-amber-100 text-amber-700 text-[9px] px-2 py-1.5 rounded-lg font-semibold shrink-0 flex flex-col items-center min-w-[45px]">
                      <span className="leading-none text-[7px] mb-0.5 text-amber-500 uppercase">Cíl</span>
                      <span className="leading-none text-sm font-bold">{node.nominated}×</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-10 text-center text-gray-400 text-sm font-medium italic">
            Zatím nebyla nasbírána žádná data.
          </div>
        )}

        <div className="bg-white">
          <div className="p-4 bg-gray-50/50 border-y border-gray-100 text-[10px] font-semibold text-gray-400 tracking-tight flex justify-between uppercase">
            <span>Kompletní struktura kategorií</span>
            <span className="text-blue-400 font-medium tracking-normal">Zvýrazněno dle popularity</span>
          </div>
          <RenderNode node={categoryData} depth={0} />
        </div>
      </div>

      <div className="p-3 bg-gray-50 text-gray-400 text-[9px] font-semibold tracking-[0.2em] text-center shrink-0 border-t border-gray-100 uppercase">
        Statistický mód • Seřazeno podle popularity
      </div>
    </div>
  );
};

export default TreeDiagram;