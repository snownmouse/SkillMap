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

const hiddenStatusColors = {
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
    padding: 80,
    spacingFactor: rootNodes.length > 2 ? 1.0 : 1.5,
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
      case 'hidden': return hiddenStatusColors;
      default: return defaultStatusColors;
    }
  };

  const statusColors = getStatusColors(theme);

  const nodeStyle = useMemo(() => ({
    width: 140,
    height: 50,
    shape: 'round-rectangle' as const,
    'background-color': '#2d2d3a',
    'border-width': 2,
    'border-color': '#4a4a5c',
    'label': 'data(label)',
    'color': '#ffffff',
    'text-valign': 'center' as const,
    'text-halign': 'center' as const,
    'font-size': '12px',
    'font-weight': 'bold' as const,
    'text-wrap': 'ellipsis' as const,
    'text-max-width': '120px',
    'text-opacity': 0.9,
    'transition-property': 'background-color, border-color, width, height',
    'transition-duration': '0.2s'
  }), []);

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
            width: 120,
            height: 120,
            shape: 'ellipse',
            'background-color': '#ffffff',
            'border-width': 5,
            'border-color': '#FFD93D',
            'label': 'data(label)',
            'color': '#3D3D3D',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': 12,
            'font-weight': 'bold' as const,
            'text-wrap': 'ellipsis' as const,
            'text-max-width': '100px',
            'text-opacity': 1,
            'transition-property': 'background-color, border-color, width, height, shape',
            'transition-duration': 400,
            'box-shadow': '0 8px 24px rgba(255, 159, 67, 0.3)'
          }
        },
        {
          selector: 'node[status="locked"]',
          style: {
            'background-color': '#FFF5E6',
            'border-color': '#FFD93D',
            'color': '#3D3D3D',
            'opacity': 0.7
          }
        },
        {
          selector: 'node[status="available"]',
          style: {
            'background-color': '#FFF0E4',
            'border-color': '#FF9F43',
            'color': '#3D3D3D'
          }
        },
        {
          selector: 'node[status="in_progress"]',
          style: {
            'background-color': '#FFF8E1',
            'border-color': '#FFB347',
            'color': '#3D3D3D'
          }
        },
        {
          selector: 'node[status="completed"]',
          style: {
            'background-color': '#E8F8F8',
            'border-color': '#4ECDC4',
            'color': '#3D3D3D'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 5,
            'line-color': '#4ECDC4',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#4ECDC4',
            'opacity': 0.8
          }
        },
        {
          selector: 'edge[type="related"]',
          style: {
            'line-style': 'dashed',
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
            'border-width': 6,
            'border-color': '#FF9F43',
            'box-shadow': '0 12px 36px rgba(255, 159, 67, 0.5)'
          }
        }
      ] : [
        {
          selector: 'node',
          style: {
            width: 140,
            height: 50,
            shape: 'round-rectangle',
            'background-color': '#ffffff',
            'border-width': 2,
            'border-color': '#d4c8b8',
            'label': 'data(label)',
            'color': '#333333',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': 12,
            'font-weight': 'bold' as const,
            'text-wrap': 'ellipsis' as const,
            'text-max-width': '120px',
            'text-opacity': 0.9,
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 300
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
            'color': '#0d3d0d'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#c8beb0',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#c8beb0',
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
          selector: 'edge:selected',
          style: {
            'line-color': '#8fbc8f',
            'target-arrow-color': '#8fbc8f',
            width: 3
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#6bbd6b'
          }
        }
      ],
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

        node.animate({
          style: {
            'width': theme === 'childrens_day' ? 140 : 160,
            'height': theme === 'childrens_day' ? 140 : 60,
            'border-width': theme === 'childrens_day' ? 6 : 3,
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
            'width': theme === 'childrens_day' ? 120 : 140,
            'height': theme === 'childrens_day' ? 120 : 50,
            'border-width': theme === 'childrens_day' ? 5 : 2,
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
      ref={containerRef}
      className="w-full h-full"
      style={{
        minHeight: '600px',
        background: theme === 'childrens_day'
          ? `
              linear-gradient(90deg, rgba(255,159,67,0.05) 1px, transparent 1px),
              linear-gradient(rgba(255,159,67,0.05) 1px, transparent 1px),
              linear-gradient(180deg, #FFF5E6 0%, #E8F8F8 40%, #F3E8FF 100%)
            `
          : `
              linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px),
              linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
              linear-gradient(180deg, #faf9f7 0%, #f5f3f0 40%, #ede8e0 100%)
            `,
        backgroundSize: '40px 40px, 40px 40px, 100% 100%'
      }}
    />
  );
};

export default SkillTreeCanvasImpl;
