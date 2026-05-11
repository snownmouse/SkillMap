import { SkillNode, SkillTreeData } from '../types/skillTree';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value?: string | null) {
  if (!value) return '未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN');
}

function statusLabel(status: SkillNode['status']) {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'in_progress':
      return '进行中';
    case 'available':
      return '可开始';
    case 'locked':
    default:
      return '未解锁';
  }
}

function difficultyLabel(difficulty: SkillNode['difficulty']) {
  switch (difficulty) {
    case 'advanced':
      return '进阶';
    case 'intermediate':
      return '中级';
    case 'beginner':
    default:
      return '入门';
  }
}

function categoryLabel(category: SkillNode['category']) {
  switch (category) {
    case 'core':
      return '核心能力';
    case 'specialization':
      return '专项能力';
    case 'general':
    default:
      return '通用能力';
  }
}

function getStatusIcon(status: SkillNode['status']): string {
  switch (status) {
    case 'completed':
      return '✅';
    case 'in_progress':
      return '🔄';
    case 'available':
      return '📋';
    case 'locked':
      return '🔒';
    default:
      return '⬜';
  }
}

function renderTagList(items: string[]) {
  if (!items.length) return '<p class="empty">暂无内容</p>';
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderResourceList(node: SkillNode) {
  if (!node.resources.length) return '<p class="empty">暂无推荐资源</p>';
  return `
    <ul>
      ${node.resources.map((resource) => `
        <li>
          <strong>${escapeHtml(resource.name)}</strong>
          <span class="muted"> · ${escapeHtml(resource.type)}</span>
          ${resource.url ? `<div><a href="${escapeHtml(resource.url)}">${escapeHtml(resource.url)}</a></div>` : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

function renderNodeCard(node: SkillNode) {
  return `
    <article class="node-card">
      <div class="node-head">
        <div>
          <div class="node-meta">${escapeHtml(categoryLabel(node.category))} · ${escapeHtml(difficultyLabel(node.difficulty))}</div>
          <h3>${escapeHtml(node.name)}</h3>
        </div>
        <div class="status status-${escapeHtml(node.status)}">${escapeHtml(statusLabel(node.status))}</div>
      </div>
      <p class="node-description">${escapeHtml(node.description || '暂无描述')}</p>
      <div class="metric-row">
        <div class="metric-card">
          <span>当前进度</span>
          <strong>${node.progress || 0}%</strong>
        </div>
        <div class="metric-card">
          <span>预计投入</span>
          <strong>${node.estimatedHours || 0} 小时</strong>
        </div>
        <div class="metric-card">
          <span>最后活跃</span>
          <strong>${escapeHtml(formatDate(node.lastActive))}</strong>
        </div>
      </div>
      ${node.whyItMatters ? `<section><h4>为什么重要</h4><p>${escapeHtml(node.whyItMatters)}</p></section>` : ''}
      ${node.milestone ? `<section><h4>阶段目标</h4><p>${escapeHtml(node.milestone)}</p></section>` : ''}
      <section>
        <h4>学习目标</h4>
        ${renderTagList(node.learningObjectives)}
      </section>
      <section>
        <h4>交付成果</h4>
        ${renderTagList(node.deliverables)}
      </section>
      <section>
        <h4>推荐资源</h4>
        ${renderResourceList(node)}
      </section>
      ${node.steps && node.steps.length > 0 ? `
        <section>
          <h4>学习步骤</h4>
          <ol>
            ${node.steps.map((step) => `
              <li>
                <strong>${escapeHtml(step.title)}</strong>
                <div>${escapeHtml(step.description)}</div>
                ${step.output ? `<div class="muted">产出：${escapeHtml(step.output)}</div>` : ''}
              </li>
            `).join('')}
          </ol>
        </section>
      ` : ''}
    </article>
  `;
}

interface TreeNode {
  id: string;
  data: SkillNode;
  children: TreeNode[];
}

function buildTree(nodes: SkillNode[], edges: any[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();

  nodes.forEach(node => {
    nodeMap.set(node.id, { id: node.id, data: node, children: [] });
  });

  const rootNodes: TreeNode[] = [];

  edges.forEach(edge => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (sourceNode && targetNode) {
      sourceNode.children.push(targetNode);
    }
  });

  nodeMap.forEach(node => {
    const hasIncoming = edges.some(edge => edge.target === node.id);
    if (!hasIncoming) {
      rootNodes.push(node);
    }
  });

  if (rootNodes.length === 0 && nodeMap.size > 0) {
    const firstNode = nodes[0];
    if (firstNode) {
      const node = nodeMap.get(firstNode.id);
      if (node) rootNodes.push(node);
    }
  }

  return rootNodes;
}

function renderTreeNode(treeNode: TreeNode, depth = 0): string {
  const connector = depth > 0 ? '│   '.repeat(depth - 1) + '├── ' : '';
  const isRoot = depth === 0;

  let html = `
    <div class="tree-node ${isRoot ? 'root' : ''}">
      ${depth > 0 ? `<div class="tree-connector"><span class="connector-line">${connector}</span><span class="connector-icon">${getStatusIcon(treeNode.data.status)}</span></div>` : `<span class="root-icon">${getStatusIcon(treeNode.data.status)}</span>`}
      <div class="tree-node-content ${isRoot ? 'root-content' : ''}">
        <div class="tree-node-header">
          <strong>${escapeHtml(treeNode.data.name)}</strong>
          <span class="tree-node-meta">${categoryLabel(treeNode.data.category)} · ${difficultyLabel(treeNode.data.difficulty)} · ${treeNode.data.progress || 0}%</span>
        </div>
        ${treeNode.data.description ? `<p class="tree-node-desc">${escapeHtml(treeNode.data.description)}</p>` : ''}
        ${treeNode.data.whyItMatters ? `<p class="tree-node-why"><em>为什么重要：</em>${escapeHtml(treeNode.data.whyItMatters)}</p>` : ''}
        ${treeNode.data.milestone ? `<p class="tree-node-milestone"><em>阶段目标：</em>${escapeHtml(treeNode.data.milestone)}</p>` : ''}
        ${treeNode.data.learningObjectives && treeNode.data.learningObjectives.length > 0 ? `
          <div class="tree-node-objectives">
            <strong>学习目标：</strong>
            <ul>${treeNode.data.learningObjectives.map(obj => `<li>${escapeHtml(obj)}</li>`).join('')}</ul>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  if (treeNode.children.length > 0) {
    html += '<div class="tree-children">';
    treeNode.children.forEach(child => {
      html += renderTreeNode(child, depth + 1);
    });
    html += '</div>';
  }

  return html;
}

export function createSkillTreeHtmlReport(treeData: SkillTreeData) {
  const nodes = Object.values(treeData.nodes || {});
  const unlockedCount = nodes.filter((node) => node.status !== 'locked').length;
  const completedCount = nodes.filter((node) => node.status === 'completed').length;
  const inProgressCount = nodes.filter((node) => node.status === 'in_progress').length;
  const averageProgress = nodes.length
    ? Math.round(nodes.reduce((sum, node) => sum + (node.progress || 0), 0) / nodes.length)
    : 0;

  const edges = treeData.edges || [];
  const rootNodes = buildTree(nodes, edges);
  const treeViewHtml = rootNodes.map(root => renderTreeNode(root)).join('');

  const nodeCards = nodes.map(renderNodeCard).join('');
  const timelineCards = (treeData.timeline || []).slice(0, 12).map((event) => `
    <article class="timeline-card">
      <div class="timeline-date">${escapeHtml(formatDate(event.date))}</div>
      <div class="timeline-type">${escapeHtml(event.type)}</div>
      <p>${escapeHtml(event.summary)}</p>
    </article>
  `).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(treeData.career)} - 技能树报告</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f2eb;
      --panel: rgba(255, 250, 245, 0.92);
      --panel-strong: #fffaf5;
      --text: #4b3d35;
      --muted: #89766d;
      --border: rgba(186, 149, 130, 0.28);
      --accent: #c97d5d;
      --accent-soft: rgba(201, 125, 93, 0.12);
      --ok: #7f9b97;
      --warn: #d1a15c;
      --lock: #a68a85;
      --shadow: 0 24px 60px rgba(120, 91, 78, 0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(234, 187, 145, 0.18), transparent 30%),
        radial-gradient(circle at top right, rgba(159, 183, 174, 0.16), transparent 24%),
        linear-gradient(180deg, #fbf7f1 0%, var(--bg) 100%);
      color: var(--text);
      line-height: 1.65;
    }
    .page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }
    .hero, .panel, .node-card, .timeline-card {
      background: var(--panel);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      backdrop-filter: blur(10px);
    }
    .hero {
      border-radius: 28px;
      padding: 32px;
      margin-bottom: 24px;
    }
    .eyebrow {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1, h2, h3, h4, p { margin-top: 0; }
    h1 {
      margin: 14px 0 8px;
      font-size: 40px;
      line-height: 1.1;
    }
    .hero-meta {
      color: var(--muted);
      font-size: 14px;
    }
    .summary {
      margin-top: 18px;
      font-size: 17px;
      max-width: 780px;
    }
    .grid {
      display: grid;
      gap: 16px;
    }
    .grid.metrics {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      margin-top: 24px;
    }
    .panel {
      border-radius: 24px;
      padding: 24px;
      margin-bottom: 18px;
    }
    .metric {
      padding: 18px;
      border-radius: 20px;
      background: var(--panel-strong);
      border: 1px solid var(--border);
    }
    .metric span, .metric-card span, .timeline-type, .node-meta {
      color: var(--muted);
      font-size: 12px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .metric strong {
      display: block;
      font-size: 30px;
      margin-top: 10px;
    }
    .two-col {
      display: grid;
      gap: 18px;
      grid-template-columns: 1.1fr 0.9fr;
      margin-bottom: 18px;
    }
    .nodes {
      display: grid;
      gap: 18px;
    }
    .node-card {
      border-radius: 24px;
      padding: 24px;
    }
    .node-head {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .status {
      white-space: nowrap;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
    }
    .status-completed { background: rgba(127, 155, 151, 0.14); color: var(--ok); }
    .status-in_progress { background: rgba(209, 161, 92, 0.14); color: #9d6b24; }
    .status-available { background: rgba(201, 125, 93, 0.12); color: var(--accent); }
    .status-locked { background: rgba(166, 138, 133, 0.14); color: var(--lock); }
    .metric-row {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      margin: 18px 0;
    }
    .metric-card {
      background: var(--panel-strong);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 14px;
    }
    .metric-card strong {
      display: block;
      margin-top: 8px;
      font-size: 18px;
      word-break: break-word;
    }
    section {
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid var(--border);
    }
    ul, ol {
      padding-left: 20px;
      margin: 0;
    }
    a {
      color: var(--accent);
      text-decoration: none;
      word-break: break-all;
    }
    .empty, .muted {
      color: var(--muted);
    }
    .timeline-list {
      display: grid;
      gap: 14px;
    }
    .timeline-card {
      border-radius: 20px;
      padding: 18px;
    }
    .timeline-date {
      font-weight: 700;
      margin-bottom: 4px;
    }
    .footer {
      margin-top: 28px;
      color: var(--muted);
      font-size: 13px;
      text-align: center;
    }
    
    /* 树状结构样式 */
    .tree-view {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 32px;
      margin-bottom: 24px;
    }
    .tree-view h2 {
      margin-bottom: 24px;
      color: var(--accent);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tree-view h2::before {
      content: '🌲';
      font-size: 28px;
    }
    .tree-node {
      position: relative;
      padding: 12px 0;
    }
    .tree-node.root {
      border-left: 3px solid var(--accent);
      margin-left: 20px;
      padding-left: 20px;
    }
    .tree-node.root .root-content {
      background: var(--accent-soft);
      border-radius: 16px;
      padding: 16px;
      border: 2px solid var(--accent);
    }
    .tree-connector {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--muted);
      font-family: monospace;
      font-size: 14px;
    }
    .connector-line {
      color: var(--border);
    }
    .root-icon {
      font-size: 24px;
      margin-right: 8px;
    }
    .connector-icon {
      font-size: 16px;
    }
    .tree-node-content {
      display: inline-block;
      vertical-align: top;
      margin-left: 8px;
      background: var(--panel-strong);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 16px;
      max-width: 800px;
    }
    .tree-node.root .tree-node-content {
      margin-left: 0;
      max-width: none;
    }
    .tree-node-header {
      margin-bottom: 8px;
    }
    .tree-node-header strong {
      font-size: 16px;
      color: var(--text);
      display: block;
      margin-bottom: 4px;
    }
    .tree-node-meta {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .tree-node-desc {
      margin: 8px 0;
      font-size: 14px;
      color: var(--text);
    }
    .tree-node-why, .tree-node-milestone {
      margin: 6px 0;
      font-size: 13px;
      color: var(--muted);
    }
    .tree-node-why em, .tree-node-milestone em {
      color: var(--accent);
      font-style: normal;
    }
    .tree-node-objectives {
      margin-top: 8px;
      font-size: 13px;
    }
    .tree-node-objectives ul {
      margin: 4px 0 0 0;
      padding-left: 18px;
    }
    .tree-node-objectives li {
      margin: 2px 0;
    }
    .tree-children {
      margin-left: 32px;
      border-left: 2px dashed var(--border);
      padding-left: 16px;
    }
    
    @media (max-width: 900px) {
      .two-col { grid-template-columns: 1fr; }
      h1 { font-size: 32px; }
      .page { padding: 24px 14px 56px; }
      .hero, .panel, .node-card { padding: 20px; }
      .tree-view { padding: 20px; }
      .tree-children { margin-left: 16px; padding-left: 8px; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="eyebrow">SkillMap Report</div>
      <h1>${escapeHtml(treeData.career)}</h1>
      <div class="hero-meta">生成时间：${escapeHtml(formatDate(treeData.generatedAt))}</div>
      <p class="summary">${escapeHtml(treeData.summary || '暂无总览说明')}</p>
      <div class="grid metrics">
        <div class="metric"><span>总体进度</span><strong>${averageProgress}%</strong></div>
        <div class="metric"><span>已解锁节点</span><strong>${unlockedCount} / ${nodes.length}</strong></div>
        <div class="metric"><span>已完成节点</span><strong>${completedCount}</strong></div>
        <div class="metric"><span>进行中节点</span><strong>${inProgressCount}</strong></div>
        <div class="metric"><span>预计周期</span><strong>${treeData.estimatedMonths || '-'} 月</strong></div>
      </div>
    </section>

    <section class="tree-view">
      <h2>技能树结构图</h2>
      <div class="tree-container">
        ${treeViewHtml || '<p class="empty">暂无技能树数据</p>'}
      </div>
    </section>

    <section class="two-col">
      <article class="panel">
        <h2>总体目标</h2>
        <p>${escapeHtml(treeData.overallObjective || '暂无总体目标')}</p>
      </article>
      <article class="panel">
        <h2>关键结果</h2>
        ${renderTagList(treeData.overallKeyResults || [])}
      </article>
    </section>

    <section class="two-col">
      <article class="panel">
        <h2>技能节点详情</h2>
        <p class="muted">以下内容按当前项目内的技能树结构生成，保留了状态、目标、步骤与资源信息，方便离线查看。</p>
      </article>
      <article class="panel">
        <h2>时间线摘要</h2>
        <div class="timeline-list">
          ${timelineCards || '<p class="empty">暂无时间线记录</p>'}
        </div>
      </article>
    </section>

    <section class="nodes">
      ${nodeCards || '<article class="panel"><p class="empty">暂无节点数据</p></article>'}
    </section>

    <div class="footer">
      本报告由当前 SkillMap 项目导出生成，可直接本地打开查看。
    </div>
  </main>
</body>
</html>`;
}
