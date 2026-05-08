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

    const isFilled = (node: any) => {
      if (!node) return false;
      if (node.id === 'meta_growth') return true;
      return Boolean(node.description) && (
        (Array.isArray(node.microMilestones) && node.microMilestones.length > 0) ||
        (Array.isArray(node.resources) && node.resources.length > 0) ||
        (Array.isArray(node.steps) && node.steps.length > 0)
      );
    };

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
          hasConversations: node.conversations.length > 0,
          partial: !isFilled(node)
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
            'background-color': '#FDF8F0',
            'border-width': 2,
            'border-color': '#D6B0A5',
            'label': 'data(label)',
            'color': '#2E2A28',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '14px',
            'font-family': 'Inter, sans-serif',
            'font-weight': 'bold',
            'text-wrap': 'wrap',
            'text-max-width': '160px',
            'shadow-blur': 10,
            'shadow-color': 'rgba(214, 176, 165, 0.2)',
            'shadow-opacity': 1,
            'shadow-offset-y': 4
          } as any
        },
        {
          selector: 'node[partial]',
          style: {
            'border-style': 'dashed',
            'opacity': 0.7,
          }
        },
        {
          selector: 'node[status="locked"]',
          style: {
            'background-color': '#F4ECE5',
            'border-color': '#E8E4DF',
            'opacity': 0.8,
            'color': '#9CA3AF'
          }
        },
        {
          selector: 'node[status="available"]',
          style: {
            'background-color': '#FDF8F0',
            'border-color': '#E89F6E',
            'color': '#E89F6E'
          }
        },
        {
          selector: 'node[status="in_progress"]',
          style: {
            'background-color': '#FFF0E5',
            'border-color': '#FF8A5C',
            'color': '#FF8A5C'
          }
        },
        {
          selector: 'node[status="completed"]',
          style: {
            'background-color': '#F2F6F5',
            'border-color': '#9CB4B3',
            'color': '#9CB4B3'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#D6B0A5',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#D6B0A5',
            'arrow-scale': 0.8
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
            'line-style': 'dashed',
            'line-dash-pattern': [6, 4]
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
      className="w-full h-full bg-app-bg"
      style={{ minHeight: '600px' }}
    />
  );
};

export default SkillTreeCanvas;
