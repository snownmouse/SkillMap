import React, { useEffect, useRef, useMemo } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import { SkillTreeData } from '../../types/skillTree';

cytoscape.use(dagre);
cytoscape.use(coseBilkent);

interface SkillTreeCanvasImplProps {
  data: SkillTreeData;
  onNodeClick: (nodeId: string) => void;
}

const statusColors = {
  locked: { bg: '#f5f3f0', border: '#d4c8b8', text: '#a0a0a0' },
  available: { bg: '#e8f4e8', border: '#8fbc8f', text: '#5a8a5a' },
  in_progress: { bg: '#fff8e8', border: '#daa520', text: '#b8860b' },
  completed: { bg: '#e0f0e0', border: '#6bbd6b', text: '#4a8a4a' }
};

const SkillTreeCanvasImpl: React.FC<SkillTreeCanvasImplProps> = ({ data, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const dataRef = useRef<SkillTreeData>(data);
  const onNodeClickRef = useRef(onNodeClick);
  const isDraggingRef = useRef(false);

  onNodeClickRef.current = onNodeClick;
  dataRef.current = data;

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
      style: [
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
      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 50,
        spacingFactor: 1.0,
        animate: true,
        animationDuration: 600,
        animationEasing: 'ease-out-cubic',
        roots: undefined as any,
        circle: false,
        grid: false,
        avoidOverlap: true
      } as any,
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
            'width': 160,
            'height': 60,
            'border-width': 3,
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
            'width': 140,
            'height': 50,
            'border-width': 2,
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
        cy.layout({
          name: 'breadthfirst',
          directed: true,
          padding: 50,
          spacingFactor: 1.0,
          animate: true,
          animationDuration: 600,
          animationEasing: 'ease-out-cubic',
          roots: undefined as any,
          circle: false,
          grid: false,
          avoidOverlap: true
        } as any).run();
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
        background: `
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
