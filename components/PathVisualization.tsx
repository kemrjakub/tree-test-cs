import React, { useMemo } from 'react';
import { TestResult, CategoryNode } from '../types';
import { categoryData } from '../data/categoryTree';

interface PathVisualizationProps {
  results: TestResult[];
}

const getVisitedNodesAtDepth = (node: CategoryNode, targetDepth: number, currentDepth: number, counts: Record<string, number>): any[] => {
  if (currentDepth === targetDepth) {
    return counts[node.name] > 0 ? [{ name: node.name, count: counts[node.name] }] : [];
  }
  let results: any[] = [];
  node.children?.forEach(child => {
    results = [...results, ...getVisitedNodesAtDepth(child, targetDepth, currentDepth + 1, counts)];
  });
  return results;
};

const PathVisualization: React.FC<PathVisualizationProps> = ({ results }) => {
  const { counts, maxDepth } = useMemo(() => {
    const c: Record<string, number> = {};
    let md = 0;
    results.forEach(res => {
      res.fullHistory?.forEach((name, idx) => {
        c[name] = (c[name] || 0) + 1;
        if (idx > md) md = idx;
      });
    });
    return { counts: c, maxDepth: md };
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="p-20 text-center text-gray-400 font-semibold tracking-widest bg-white rounded-3xl border-4 border-dashed border-gray-50 uppercase">
        Zatím žádná data pro vizualizaci
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm overflow-hidden flex flex-col">
      <div className="mb-8 border-b border-gray-100 pb-6">
        <h3 className="text-xl font-semibold text-gray-900 leading-none mb-2 tracking-tight">Vizualizace průchodů</h3>
        <p className="text-gray-400 text-[10px] font-semibold tracking-[0.2em] uppercase">
          Vizualizace postupu uživatelů skrze úrovně kategorií
        </p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-6 min-w-[1000px]">
          {[...Array(maxDepth + 1)].map((_, depth) => {
            const nodes = getVisitedNodesAtDepth(categoryData, depth, 0, counts);
            if (nodes.length === 0) return null;

            return (
              <div key={depth} className="flex-1 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${depth * 100}ms` }}>
                <div className="text-[10px] font-semibold text-blue-500 bg-blue-50 py-2 px-3 rounded-lg mb-2 text-center tracking-widest border border-blue-100 uppercase">
                  Úroveň {depth + 1}
                </div>
                {nodes.sort((a, b) => b.count - a.count).map(n => (
                  <div 
                    key={n.name}
                    className="bg-white border-2 border-gray-50 p-4 rounded-2xl shadow-sm hover:border-blue-200 transition-all group"
                  >
                    <div className="text-[11px] font-semibold text-gray-800 mb-2 truncate group-hover:text-blue-600" title={n.name}>
                        {n.name}
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="text-2xl font-semibold text-gray-900 leading-none">
                            {Math.round((n.count / results.length) * 100)}<span className="text-sm text-gray-400 ml-0.5 font-normal">%</span>
                        </div>
                        <div className="text-[9px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded uppercase">
                            {n.count} os.
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div 
                            className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${(n.count / results.length) * 100}%` }}
                        />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center text-[10px] font-semibold text-gray-400 tracking-widest uppercase">
          <span>Celkový vzorek: {results.length} respondentů</span>
          <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Live data
          </span>
      </div>
    </div>
  );
};

export default PathVisualization;