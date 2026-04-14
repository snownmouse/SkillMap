import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { SkillTreeData } from '../../types/skillTree';

interface SkillTreeCanvasProps {
  data: SkillTreeData;
  onNodeClick: (nodeId: string) => void;
}

/**
 * Cytoscape.js 技能树画布组件
 */
const SkillTreeCanvas: React.FC<SkillTreeCanvasProps> = ({ data, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 转换数据为 Cytoscape 格式
    const elements: cytoscape.ElementDefinition[] = [];
    
    Object.values(data.nodes).forEach((node: any) => {
      elements.push({
        data: { 
          id: node.id, 
          label: node.name,
          progress: node.progress,
          status: node.status,
          category: node.category,
          hasConversations: node.conversations.length > 0
        }
      });
    });

    data.edges.forEach(edge => {
      elements.push({
        data: { 
          id: `${edge.from}-${edge.to}`,
          source: edge.from, 
          target: edge.to,
          type: edge.type
        }
      });
    });

    // 初始化 Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'width': 180,
            'height': 60,
            'shape': 'round-rectangle',
            'background-color': '#141420',
            'border-width': 2,
            'border-color': '#2a2a3a',
            'label': 'data(label)',
            'color': '#e0e0e0',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '14px',
            'font-weight': 'bold',
            'text-wrap': 'wrap',
            'text-max-width': '160px',
          } as any
        },
        {
          selector: 'node[status="locked"]',
          style: {
            'background-color': '#333333',
            'border-color': '#555555',
            'opacity': 0.6,
            'color': '#888888'
          }
        },
        {
          selector: 'node[status="available"]',
          style: {
            'background-color': '#1a3a5c',
            'border-color': '#4A90D9',
            'color': '#4A90D9'
          }
        },
        {
          selector: 'node[status="in_progress"]',
          style: {
            'background-color': '#3d2b00',
            'border-color': '#E67E22',
            'color': '#E67E22'
          }
        },
        {
          selector: 'node[status="completed"]',
          style: {
            'background-color': '#0d3320',
            'border-color': '#2ECC71',
            'color': '#2ECC71'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#555',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#555'
          }
        },
        {
          selector: 'edge[type="prerequisite"]',
          style: {
            'line-style': 'solid'
          }
        },
        {
          selector: 'edge[type="related"]',
          style: {
            'line-style': 'dashed'
          }
        }
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 50,
        spacingFactor: 1.2
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false
    });

    // 事件监听
    cy.on('tap', 'node', (evt) => {
      const nodeId = evt.target.id();
      onNodeClick(nodeId);
    });

    cy.on('mouseover', 'node', (evt) => {
      evt.target.style('border-width', 4);
      containerRef.current!.style.cursor = 'pointer';
    });

    cy.on('mouseout', 'node', (evt) => {
      evt.target.style('border-width', 2);
      containerRef.current!.style.cursor = 'default';
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [data, onNodeClick]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-dark-bg"
      style={{ minHeight: '600px' }}
    />
  );
};

export default SkillTreeCanvas;
