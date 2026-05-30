import React, { useEffect, useRef, useMemo } from 'react';
import cytoscape from 'cytoscape';
import { SkillTreeData } from '../../types/skillTree';
import { useTheme } from '../../context/ThemeContext';

interface SkillTreeCanvasImplProps {
  data: SkillTreeData;
  onNodeClick: (nodeId: string) => void;
}

const defaultStatusColors = {
  locked: { bg: '#f5f3f0', border: '#d4c8b8', text: '#a0a0a0' },
  available: { bg: '#e8f4e8', border: '#8fbc8f', text: '#5a8a5a' },
  in_progress: { bg: '#fff8e8', border: '#daa520', text: '#b8860b' },
  completed: { bg: '#e0f0e0', border: '#6bbd6b', text: '#4a8a4a' }
};

const childrensDayStatusColors = {
  locked: { bg: '#FFF5E6', border: '#FFD93D', text: '#3D3D3D' },
  available: { bg: '#FFF0E4', border: '#FF9F43', text: '#3D3D3D' },
  in_progress: { bg: '#FFF8E1', border: '#FFB347', text: '#3D3D3D' },
  completed: { bg: '#E8F8F8', border: '#4ECDC4', text: '#3D3D3D' }
};

const growthStatusColors = {
  locked: { bg: '#F0FFF4', border: '#48BB78', text: '#22543D' },
  available: { bg: '#C6F6D5', border: '#68D391', text: '#22543D' },
  in_progress: { bg: '#9AE6B4', border: '#48BB78', text: '#22543D' },
  completed: { bg: '#68D391', border: '#38B2AC', text: '#22543D' }
};

const quietGrowthStatusColors = {
  locked: { bg: '#1A1A2E', border: '#6B7280', text: '#E0E0E8' },
  available: { bg: '#2A2A3E', border: '#7B7B8A', text: '#E0E0E8' },
  in_progress: { bg: '#3A3A4E', border: '#8B8BA6', text: '#E0E0E8' },
  completed: { bg: '#4A4A5E', border: '#9B8AA6', text: '#E0E0E8' }
};

function getLayoutConfig(data: SkillTreeData) {
  const nodeIds = new Set(Object.keys(data.nodes));
  const hasIncoming = new Set<string>();
  for (const edge of data.edges) {
    if (nodeIds.has(edge.to)) hasIncoming.add(edge.to);
  }
  const rootNodes = Object.keys(data.nodes).filter(id => !hasIncoming.has(id));

  const layout: Record<string, any> = {
    name: 'breadthfirst',
    directed: true,
    padding: 60,
    spacingFactor: rootNodes.length > 2 ? 1.2 : 1.8,
    animate: true,
    animationDuration: 600,
    animationEasing: 'ease-out-cubic',
    circle: false,
    grid: false,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: true,
  };

  if (rootNodes.length > 0) {
    layout.roots = rootNodes;
  }

  return layout;
}

const SkillTreeCanvasImpl: React.FC<SkillTreeCanvasImplProps> = ({ data, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const dataRef = useRef<SkillTreeData>(data);
  const onNodeClickRef = useRef(onNodeClick);
  const isDraggingRef = useRef(false);
  const { theme } = useTheme();

  onNodeClickRef.current = onNodeClick;
  dataRef.current = data;

  const getStatusColors = (currentTheme: string) => {
    switch (currentTheme) {
      case 'childrens_day': return childrensDayStatusColors;
      case 'growth': return growthStatusColors;
      case 'quiet_growth': return quietGrowthStatusColors;
      default: return defaultStatusColors;
    }
  };

  const statusColors = getStatusColors(theme);

  const getThemeNodeConfig = (currentTheme: string) => {
    switch (currentTheme) {
      case 'childrens_day':
        return {
          width: 110,
          height: 110,
          shape: 'ellipse',
          fontSize: 12,
          textMaxWidth: '95px'
        };
      case 'growth':
        return {
          width: 130,
          height: 55,
          shape: 'round-rectangle',
          fontSize: 12,
          textMaxWidth: '115px'
        };
      case 'quiet_growth':
        return {
          width: 120,
          height: 45,
          shape: 'rectangle',
          fontSize: 11,
          textMaxWidth: '105px'
        };
      default:
        return {
          width: 120,
          height: 45,
          shape: 'round-rectangle',
          fontSize: 11,
          textMaxWidth: '105px'
        };
    }
  };

  const nodeConfig = getThemeNodeConfig(theme);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements: cytoscape.ElementDefinition[] = [];

    Object.values(data.nodes).forEach((node: any) => {
      elements.push({
        data: {
          id: node.id,
          label: node.name,
          progress: node.progress || 0,
          status: node.status || 'locked',
          category: node.category,
          hasConversations: node.conversations && node.conversations.length > 0
        }
      });
    });

    data.edges.forEach(edge => {
      elements.push({
        data: {
          id: `${edge.from}-${edge.to}`,
          source: edge.from,
          target: edge.to,
          type: edge.type || 'prerequisite'
        }
      });
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: theme === 'childrens_day' ? [
        {
          selector: 'node',
          style: {
            width: nodeConfig.width,
            height: nodeConfig.height,
            shape: nodeConfig.shape,
            'background-fill': 'linear-gradient',
            'background-gradient-stop-colors': '#ffffff #FFF5FA',
            'background-gradient-stop-positions': '0% 100%',
            'border-width': 5,
            'border-color': '#FF6B9D',
            'border-style': 'solid',
            'label': 'data(label)',
            'color': '#2D1F3D',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': nodeConfig.fontSize,
            'font-weight': 'bold' as const,
            'text-wrap': 'ellipsis' as const,
            'text-max-width': nodeConfig.textMaxWidth,
            'text-opacity': 1,
            'transition-property': 'background-color, border-color, width, height, shape, border-width',
            'transition-duration': 400,
            'shadow-blur': 16,
            'shadow-color': 'rgba(255, 107, 157, 0.35)',
            'shadow-offset-x': 0,
            'shadow-offset-y': 3
          }
        },
        {
          selector: 'node[status="locked"]',
          style: {
            'background-color': '#FFF5E6',
            'border-color': '#FFD93D',
            'color': '#8B7355',
            'opacity': 0.65
          }
        },
        {
          selector: 'node[status="available"]',
          style: {
            'background-color': '#FFF0E4',
            'border-color': '#FF9F43',
            'color': '#8B5A2B'
          }
        },
        {
          selector: 'node[status="in_progress"]',
          style: {
            'background-color': '#FFF8E1',
            'border-color': '#FFB347',
            'color': '#8B6914'
          }
        },
        {
          selector: 'node[status="completed"]',
          style: {
            'background-color': '#E8F8F8',
            'border-color': '#4ECDC4',
            'color': '#2D6B6B'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 4,
            'line-color': '#FF6B9D',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#FF6B9D',
            'opacity': 0.8,
            'shadow-blur': 6,
            'shadow-color': 'rgba(255, 107, 157, 0.25)',
            'shadow-offset-x': 0,
            'shadow-offset-y': 2
          }
        },
        {
          selector: 'edge[type="related"]',
          style: {
            'line-style': 'dashed',
            'line-dash-pattern': [8, 4],
            'opacity': 0.5
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#FF9F43',
            'target-arrow-color': '#FF9F43',
            width: 6
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 7,
            'border-color': '#FF9F43',
            'shadow-blur': 20,
            'shadow-color': 'rgba(255, 159, 67, 0.45)'
          }
        }
      ] : theme === 'growth' ? [
        {
          selector: 'node',
          style: {
            width: nodeConfig.width,
            height: nodeConfig.height,
            shape: nodeConfig.shape,
            'background-fill': 'linear-gradient',
            'background-gradient-stop-colors': '#ffffff #E8F5E9',
            'background-gradient-stop-positions': '0% 100%',
            'border-width': 3,
            'border-color': '#48BB78',
            'border-style': 'solid',
            'label': 'data(label)',
            'color': '#1A3D1A',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': nodeConfig.fontSize,
            'font-weight': 'bold' as const,
            'text-wrap': 'ellipsis' as const,
            'text-max-width': nodeConfig.textMaxWidth,
            'text-opacity': 1,
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 350,
            'shadow-blur': 14,
            'shadow-color': 'rgba(72, 187, 120, 0.28)',
            'shadow-offset-x': 0,
            'shadow-offset-y': 2
          }
        },
        {
          selector: 'node[status="locked"]',
          style: {
            'background-color': '#F0FFF4',
            'border-color': '#68D391',
            'color': '#5A8A5A',
            'opacity': 0.7
          }
        },
        {
          selector: 'node[status="available"]',
          style: {
            'background-color': '#C6F6D5',
            'border-color': '#48BB78',
            'color': '#1A5A1A'
          }
        },
        {
          selector: 'node[status="in_progress"]',
          style: {
            'background-color': '#9AE6B4',
            'border-color': '#68D391',
            'color': '#1A6A1A'
          }
        },
        {
          selector: 'node[status="completed"]',
          style: {
            'background-color': '#68D391',
            'border-color': '#38B2AC',
            'color': '#1A4A2A'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#48BB78',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#48BB78',
            'opacity': 0.75,
            'shadow-blur': 8,
            'shadow-color': 'rgba(72, 187, 120, 0.22)',
            'shadow-offset-x': 0,
            'shadow-offset-y': 2
          }
        },
        {
          selector: 'edge[type="related"]',
          style: {
            'line-style': 'dashed',
            'line-dash-pattern': [6, 3],
            'opacity': 0.55
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#38B2AC',
            'target-arrow-color': '#38B2AC',
            width: 4
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#38B2AC',
            'shadow-blur': 18,
            'shadow-color': 'rgba(56, 178, 172, 0.4)'
          }
        }
      ] : theme === 'quiet_growth' ? [
        {
          selector: 'node',
          style: {
            width: nodeConfig.width,
            height: nodeConfig.height,
            shape: nodeConfig.shape,
            'background-fill': 'linear-gradient',
            'background-gradient-stop-colors': '#3A3A4E #2A2A3E',
            'background-gradient-stop-positions': '0% 100%',
            'border-width': 2,
            'border-color': '#6B7280',
            'border-style': 'solid',
            'label': 'data(label)',
            'color': '#D0D0E0',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': nodeConfig.fontSize,
            'font-weight': 'bold' as const,
            'text-wrap': 'ellipsis' as const,
            'text-max-width': nodeConfig.textMaxWidth,
            'text-opacity': 1,
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 300,
            'shadow-blur': 12,
            'shadow-color': 'rgba(0, 0, 0, 0.35)',
            'shadow-offset-x': 0,
            'shadow-offset-y': 2
          }
        },
        {
          selector: 'node[status="locked"]',
          style: {
            'background-color': '#1A1A2E',
            'border-color': '#5A5A6A',
            'color': '#9090A8',
            'opacity': 0.55
          }
        },
        {
          selector: 'node[status="available"]',
          style: {
            'background-color': '#2A2A3E',
            'border-color': '#7B7B8A',
            'color': '#B0B0C0'
          }
        },
        {
          selector: 'node[status="in_progress"]',
          style: {
            'background-color': '#3A3A4E',
            'border-color': '#8B8BA6',
            'color': '#C0C0D0'
          }
        },
        {
          selector: 'node[status="completed"]',
          style: {
            'background-color': '#4A4A5E',
            'border-color': '#9B8AA6',
            'color': '#D0D0E0'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#5A5A7A',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#5A5A7A',
            'opacity': 0.6
          }
        },
        {
          selector: 'edge[type="related"]',
          style: {
            'line-style': 'dashed',
            'line-dash-pattern': [4, 4],
            'opacity': 0.4
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#9B8AA6',
            'target-arrow-color': '#9B8AA6',
            width: 3
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#9B8AA6',
            'shadow-blur': 16,
            'shadow-color': 'rgba(155, 138, 166, 0.38)'
          }
        }
      ] : [
        {
          selector: 'node',
          style: {
            width: nodeConfig.width,
            height: nodeConfig.height,
            shape: nodeConfig.shape,
            'background-color': '#ffffff',
            'border-width': 2,
            'border-color': '#d4c8b8',
            'label': 'data(label)',
            'color': '#333333',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': nodeConfig.fontSize,
            'font-weight': 'bold' as const,
            'text-wrap': 'ellipsis' as const,
            'text-max-width': nodeConfig.textMaxWidth,
            'text-opacity': 0.9,
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 300,
            'box-shadow': '0 4px 12px rgba(0,0,0,0.1)'
          }
        },
        {
          selector: 'node[status="locked"]',
          style: {
            'background-color': '#f5f3f0',
            'border-color': '#d4c8b8',
            'color': '#333333',
            'opacity': 0.6
          }
        },
        {
          selector: 'node[status="available"]',
          style: {
            'background-color': '#e8f4e8',
            'border-color': '#8fbc8f',
            'color': '#1a3d1a'
          }
        },
        {
          selector: 'node[status="in_progress"]',
          style: {
            'background-color': '#fff8e8',
            'border-color': '#daa520',
            'color': '#5c3d00'
          }
        },
        {
          selector: 'node[status="completed"]',
          style: {
            'background-color': '#e0f0e0',
            'border-color': '#6bbd6b',
            'color': '#1a5a1a'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#c8b898',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#c8b898',
            'opacity': 0.6
          }
        },
        {
          selector: 'edge[type="related"]',
          style: {
            'line-style': 'dashed',
            'opacity': 0.4
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#8fbc8f',
            'box-shadow': '0 6px 16px rgba(0,0,0,0.15)'
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#8fbc8f',
            'target-arrow-color': '#8fbc8f',
            width: 3
          }
        }
      ];
      
      layout: getLayoutConfig(data) as any,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      wheelSensitivity: 0.3,
      minZoom: 0.3,
      maxZoom: 2
    });

    cy.on('tap', 'node', (evt) => {
      if (isDraggingRef.current) return;
      const nodeId = evt.target.id();
      onNodeClickRef.current(nodeId);
    });

    cy.on('drag', 'node', () => {
      isDraggingRef.current = true;
    });

    cy.on('dragfree', 'node', () => {
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    });

    cy.on('mouseover', 'node', (evt) => {
      try {
        const node = evt.target;
        if (!node) return;

        const hoverWidth = theme === 'childrens_day' ? 130 : theme === 'growth' ? 150 : 140;
        const hoverHeight = theme === 'childrens_day' ? 130 : theme === 'growth' ? 65 : 55;
        const hoverBorderWidth = theme === 'childrens_day' ? 6 : theme === 'growth' ? 4 : 3;

        node.animate({
          style: {
            'width': hoverWidth,
            'height': hoverHeight,
            'border-width': hoverBorderWidth,
            'z-index': 999
          }
        }, {
          duration: 250,
          easing: 'ease-out-cubic'
        });

        containerRef.current!.style.cursor = 'pointer';
      } catch (error) {
        console.warn('Mouseover animation error:', error);
      }
    });

    cy.on('mouseout', 'node', (evt) => {
      try {
        const node = evt.target;
        if (!node) return;

        node.animate({
          style: {
            'width': nodeConfig.width,
            'height': nodeConfig.height,
            'border-width': theme === 'childrens_day' ? 5 : theme === 'growth' ? 3 : 2,
            'z-index': 1
          }
        }, {
          duration: 250,
          easing: 'ease-out-cubic'
        });

        containerRef.current!.style.cursor = 'default';
      } catch (error) {
        console.warn('Mouseout animation error:', error);
      }
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [data, nodeStyle]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !data) return;

    const currentNodes = new Set(cy.nodes().map(n => n.id()));
    const newNodes = new Set(Object.keys(data.nodes));

    const nodesAdded = ![...newNodes].every(id => currentNodes.has(id as string));
    const nodesRemoved = ![...currentNodes].every(id => newNodes.has(id as string));

    if (nodesAdded || nodesRemoved) {
      const savedPositions: Record<string, { x: number; y: number }> = {};
      cy.nodes().forEach(node => {
        const pos = node.position();
        savedPositions[node.id()] = { x: pos.x, y: pos.y };
      });

      cy.elements().remove();

      const elements: cytoscape.ElementDefinition[] = [];
      Object.values(data.nodes).forEach((node: any) => {
        const elData: any = {
          data: {
            id: node.id,
            label: node.name,
            progress: node.progress || 0,
            status: node.status || 'locked',
            category: node.category,
            hasConversations: node.conversations && node.conversations.length > 0
          }
        };
        if (savedPositions[node.id]) {
          elData.position = savedPositions[node.id];
        }
        elements.push(elData);
      });

      data.edges.forEach(edge => {
        elements.push({
          data: {
            id: `${edge.from}-${edge.to}`,
            source: edge.from,
            target: edge.to,
            type: edge.type || 'prerequisite'
          }
        });
      });

      cy.add(elements);

      const hasAllPositions = Object.keys(data.nodes).every(id => savedPositions[id]);
      if (hasAllPositions) {
        cy.nodes().forEach(node => {
          const saved = savedPositions[node.id()];
          if (saved) {
            node.position({ x: saved.x, y: saved.y });
          }
        });
      } else {
        cy.layout(getLayoutConfig(data) as any).run();
      }
    } else {
      cy.nodes().forEach(node => {
        const nodeData = data.nodes[node.id()];
        if (nodeData) {
          // 更新节点数据
          node.data({
            progress: nodeData.progress || 0,
            status: nodeData.status || 'locked',
            label: nodeData.name,
            category: nodeData.category,
            hasConversations: nodeData.conversations && nodeData.conversations.length > 0
          });
          
          // 手动更新样式以确保颜色正确显示
          const status = nodeData.status || 'locked';
          const colors = statusColors[status as keyof typeof statusColors];
          if (colors) {
            node.style({
              'background-color': colors.bg,
              'border-color': colors.border,
              'color': colors.text
            });
          }
        }
      });
    }
  }, [data]);

  return (
    <div
      className="w-full h-full relative"
      style={{
        minHeight: '600px',
        background: theme === 'childrens_day'
          ? `
              radial-gradient(circle at 10% 20%, rgba(255,107,157,0.2) 0%, transparent 30%),
              radial-gradient(circle at 90% 30%, rgba(78,205,196,0.2) 0%, transparent 30%),
              radial-gradient(circle at 50% 70%, rgba(166,108,255,0.2) 0%, transparent 30%),
              radial-gradient(circle at 20% 80%, rgba(255,179,71,0.2) 0%, transparent 30%),
              linear-gradient(180deg, #FFF0F8 0%, #FFE5F0 50%, #F0E5FF 100%)
            `
          : theme === 'growth'
          ? `
              radial-gradient(circle at 15% 25%, rgba(72,187,120,0.25) 0%, transparent 30%),
              radial-gradient(circle at 85% 15%, rgba(56,178,172,0.2) 0%, transparent 25%),
              radial-gradient(circle at 50% 80%, rgba(104,211,145,0.25) 0%, transparent 30%),
              radial-gradient(circle at 75% 60%, rgba(72,187,120,0.2) 0%, transparent 25%),
              linear-gradient(180deg, #F0FFF4 0%, #C6F6D5 50%, #9AE6B4 100%)
            `
          : theme === 'quiet_growth'
          ? `
              radial-gradient(circle at 20% 30%, rgba(155,138,166,0.15) 0%, transparent 35%),
              radial-gradient(circle at 80% 20%, rgba(107,114,128,0.12) 0%, transparent 30%),
              radial-gradient(circle at 50% 70%, rgba(155,138,166,0.1) 0%, transparent 32%),
              radial-gradient(circle at 30% 85%, rgba(107,114,128,0.15) 0%, transparent 30%),
              radial-gradient(circle at 70% 50%, rgba(155,138,166,0.08) 0%, transparent 35%),
              linear-gradient(180deg, #1A1A2E 0%, #16213E 50%, #0F0F1A 100%)
            `
          : `
              linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px),
              linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
              linear-gradient(180deg, #faf9f7 0%, #f5f3f0 40%, #ede8e0 100%)
            `
      }}
    >
      {/* 装饰层 - 放在底层，z-index低 */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {theme === 'childrens_day' && (
          <>
            <div style={{
              position: 'absolute',
              top: '10%',
              left: '5%',
              fontSize: '40px',
              opacity: 0.12,
              animation: 'float 6s ease-in-out infinite',
              filter: 'drop-shadow(0 4px 8px rgba(255,107,157,0.3))'
            }}>🍭</div>
            <div style={{
              position: 'absolute',
              top: '20%',
              right: '8%',
              fontSize: '35px',
              opacity: 0.1,
              animation: 'float 8s ease-in-out infinite 1s',
              filter: 'drop-shadow(0 4px 8px rgba(78,205,196,0.3))'
            }}>🍬</div>
            <div style={{
              position: 'absolute',
              bottom: '25%',
              left: '12%',
              fontSize: '38px',
              opacity: 0.11,
              animation: 'float 7s ease-in-out infinite 2s',
              filter: 'drop-shadow(0 4px 8px rgba(166,108,255,0.3))'
            }}>🍫</div>
            <div style={{
              position: 'absolute',
              bottom: '15%',
              right: '10%',
              fontSize: '42px',
              opacity: 0.12,
              animation: 'float 9s ease-in-out infinite 0.5s',
              filter: 'drop-shadow(0 4px 8px rgba(255,179,71,0.3))'
            }}>🎈</div>
            <div style={{
              position: 'absolute',
              top: '60%',
              left: '3%',
              fontSize: '32px',
              opacity: 0.09,
              animation: 'float 7s ease-in-out infinite 1.5s',
              filter: 'drop-shadow(0 4px 8px rgba(255,107,157,0.25))'
            }}>🎀</div>
          </>
        )}

        {theme === 'growth' && (
          <>
            <div style={{
              position: 'absolute',
              top: '8%',
              left: '6%',
              fontSize: '36px',
              opacity: 0.1,
              animation: 'sway 8s ease-in-out infinite',
              filter: 'drop-shadow(0 4px 8px rgba(72,187,120,0.25))'
            }}>🌿</div>
            <div style={{
              position: 'absolute',
              top: '15%',
              right: '10%',
              fontSize: '40px',
              opacity: 0.12,
              animation: 'sway 10s ease-in-out infinite 1s',
              filter: 'drop-shadow(0 4px 8px rgba(56,178,172,0.25))'
            }}>🍃</div>
            <div style={{
              position: 'absolute',
              bottom: '20%',
              left: '8%',
              fontSize: '34px',
              opacity: 0.11,
              animation: 'sway 9s ease-in-out infinite 2s',
              filter: 'drop-shadow(0 4px 8px rgba(104,211,145,0.25))'
            }}>🌱</div>
            <div style={{
              position: 'absolute',
              bottom: '12%',
              right: '12%',
              fontSize: '38px',
              opacity: 0.09,
              animation: 'sway 7s ease-in-out infinite 0.5s',
              filter: 'drop-shadow(0 4px 8px rgba(72,187,120,0.2))'
            }}>🌴</div>
            <div style={{
              position: 'absolute',
              top: '45%',
              right: '4%',
              fontSize: '30px',
              opacity: 0.08,
              animation: 'sway 11s ease-in-out infinite 1.5s',
              filter: 'drop-shadow(0 4px 8px rgba(56,178,172,0.2))'
            }}>🍀</div>
          </>
        )}

        {theme === 'quiet_growth' && (
          <>
            <div style={{
              position: 'absolute',
              top: '12%',
              left: '8%',
              fontSize: '28px',
              opacity: 0.12,
              animation: 'twinkle 6s ease-in-out infinite',
              filter: 'drop-shadow(0 0 10px rgba(155,138,166,0.4))'
            }}>🌙</div>
            <div style={{
              position: 'absolute',
              top: '18%',
              right: '12%',
              fontSize: '20px',
              opacity: 0.16,
              animation: 'twinkle 8s ease-in-out infinite 1s',
              filter: 'drop-shadow(0 0 8px rgba(155,138,166,0.35))'
            }}>✨</div>
            <div style={{
              position: 'absolute',
              bottom: '25%',
              left: '10%',
              fontSize: '18px',
              opacity: 0.14,
              animation: 'twinkle 7s ease-in-out infinite 2s',
              filter: 'drop-shadow(0 0 8px rgba(155,138,166,0.3))'
            }}>⭐</div>
            <div style={{
              position: 'absolute',
              bottom: '15%',
              right: '8%',
              fontSize: '22px',
              opacity: 0.13,
              animation: 'twinkle 9s ease-in-out infinite 0.5s',
              filter: 'drop-shadow(0 0 10px rgba(155,138,166,0.35))'
            }}>🌟</div>
            <div style={{
              position: 'absolute',
              top: '55%',
              left: '5%',
              fontSize: '16px',
              opacity: 0.11,
              animation: 'twinkle 5s ease-in-out infinite 1.5s',
              filter: 'drop-shadow(0 0 6px rgba(155,138,166,0.25))'
            }}>✦</div>
          </>
        )}
      </div>

      {/* Cytoscape画布层 */}
      <div
        ref={containerRef}
        className="w-full h-full absolute inset-0"
        style={{ zIndex: 2 }}
      />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        @keyframes sway {
          0%, 100% { transform: rotate(-4deg) scale(1); }
          50% { transform: rotate(4deg) scale(1.03); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
};

export default SkillTreeCanvasImpl;
