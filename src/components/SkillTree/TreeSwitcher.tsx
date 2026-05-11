import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, GitBranch, Plus, Sparkles } from 'lucide-react';
import { difyApi } from '../../services/difyApi';

interface TreeInfo {
  id: string;
  career: string;
  created_at: string;
}

interface TreeSwitcherProps {
  currentTreeId?: string;
  onTreeSelect: (treeId: string) => void;
  onCreateNew: () => void;
}

export function TreeSwitcher({ currentTreeId, onTreeSelect, onCreateNew }: TreeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [trees, setTrees] = useState<TreeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTrees = async () => {
    setIsLoading(true);
    try {
      const result = await difyApi.listTrees({ limit: 50 });
      setTrees(result.trees);
    } catch (error) {
      console.error('加载技能树列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTrees();
    }
  }, [isOpen]);

  const handleSelect = (treeId: string) => {
    setIsOpen(false);
    onTreeSelect(treeId);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const currentTree = trees.find(t => t.id === currentTreeId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text transition-all hover:bg-app-surface/80"
      >
        <GitBranch size={16} className="text-skill-core" />
        <span className="max-w-[150px] truncate">
          {currentTree?.career || '选择技能树'}
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-app-border bg-app-surface shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-app-border">
            <div className="text-xs font-semibold uppercase tracking-wider text-app-muted px-2">
              我的技能树 ({trees.length})
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-app-muted">
                加载中...
              </div>
            ) : trees.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-app-muted">
                还没有技能树
              </div>
            ) : (
              <div className="space-y-1">
                {trees.map((tree) => (
                  <button
                    key={tree.id}
                    onClick={() => handleSelect(tree.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                      tree.id === currentTreeId
                        ? 'bg-skill-core/10 text-skill-core'
                        : 'hover:bg-app-bg text-app-text'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {tree.career || '未命名'}
                      </div>
                      <div className="text-xs text-app-muted mt-0.5">
                        {formatDate(tree.created_at)}
                      </div>
                    </div>
                    {tree.id === currentTreeId && (
                      <Sparkles size={14} className="text-skill-core" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-app-border">
            <button
              onClick={() => {
                setIsOpen(false);
                onCreateNew();
              }}
              className="w-full flex items-center gap-2 rounded-lg bg-skill-core/10 px-3 py-2.5 text-sm font-medium text-skill-core transition-all hover:bg-skill-core/20"
            >
              <Plus size={16} />
              生成新技能树
            </button>
          </div>
        </div>
      )}
    </div>
  );
}