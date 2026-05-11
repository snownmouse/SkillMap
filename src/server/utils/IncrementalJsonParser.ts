export interface IncrementalParseResult {
  nodeId: string;
  nodeData: any;
}

export class IncrementalJsonParser {
  private buffer = '';
  private emittedNodeIds = new Set<string>();
  private onNodeCallback: (result: IncrementalParseResult) => void;
  private metaExtracted = false;
  private meta: {
    career?: string;
    summary?: string;
    version?: string;
    estimatedMonths?: number;
    overallObjective?: string;
    overallKeyResults?: string[];
    categories?: any[];
  } = {};
  private nodesObjectStart = -1;
  private lastScanPos = 0;

  constructor(onNode: (result: IncrementalParseResult) => void) {
    this.onNodeCallback = onNode;
  }

  append(text: string): void {
    this.buffer += text;
    this.tryExtractMeta();
    this.scanForCompleteNodes();
  }

  private tryExtractMeta(): void {
    if (this.metaExtracted) return;

    const careerMatch = this.buffer.match(/"career"\s*:\s*"([^"]*)"/);
    if (careerMatch) this.meta.career = careerMatch[1];

    const summaryMatch = this.buffer.match(/"summary"\s*:\s*"([^"]*)"/);
    if (summaryMatch) this.meta.summary = summaryMatch[1];

    const versionMatch = this.buffer.match(/"version"\s*:\s*"([^"]*)"/);
    if (versionMatch) this.meta.version = versionMatch[1];

    const monthsMatch = this.buffer.match(/"estimatedMonths"\s*:\s*(\d+)/);
    if (monthsMatch) this.meta.estimatedMonths = parseInt(monthsMatch[1]);

    const objectiveMatch = this.buffer.match(/"overallObjective"\s*:\s*"([^"]*)"/);
    if (objectiveMatch) this.meta.overallObjective = objectiveMatch[1];

    if (this.buffer.includes('"nodes"')) {
      this.metaExtracted = true;
    }
  }

  private scanForCompleteNodes(): void {
    if (this.nodesObjectStart === -1) {
      const nodesIdx = this.buffer.indexOf('"nodes"');
      if (nodesIdx === -1) return;

      let pos = nodesIdx + 7;
      while (pos < this.buffer.length) {
        if (this.buffer[pos] === '{') {
          this.nodesObjectStart = pos;
          break;
        }
        pos++;
      }
      if (this.nodesObjectStart === -1) return;
    }

    const buf = this.buffer;
    const start = this.nodesObjectStart + 1;
    let pos = start + this.lastScanPos;

    let inString = false;
    let escape = false;
    let depth = 0;
    let keyName = '';
    let keyStart = -1;
    let nodeStart = -1;

    while (pos < buf.length) {
      const char = buf[pos];

      if (escape) {
        escape = false;
        pos++;
        continue;
      }

      if (char === '\\' && inString) {
        escape = true;
        pos++;
        continue;
      }

      if (char === '"') {
        if (!inString && depth === 0) {
          keyStart = pos + 1;
        } else if (inString && depth === 0 && keyStart >= 0) {
          keyName = buf.substring(keyStart, pos);
          keyStart = -1;
        }
        inString = !inString;
        pos++;
        continue;
      }

      if (inString) {
        pos++;
        continue;
      }

      if (char === '{') {
        if (depth === 0 && keyName && !this.emittedNodeIds.has(keyName)) {
          nodeStart = pos;
        }
        depth++;
        pos++;
        continue;
      }

      if (char === '}') {
        depth--;
        if (depth === 0 && nodeStart >= 0 && keyName) {
          const nodeJson = buf.substring(nodeStart, pos + 1);
          try {
            const nodeData = JSON.parse(nodeJson);
            this.emittedNodeIds.add(keyName);
            this.onNodeCallback({ nodeId: keyName, nodeData });
            console.log('[DEBUG] 增量解析器提取节点:', keyName);
          } catch (e) {
            console.log('[DEBUG] 增量解析器解析节点失败:', keyName, (e as Error).message);
          }
          keyName = '';
          nodeStart = -1;
          this.lastScanPos = pos + 1 - start;
        }
        if (depth < 0) {
          this.lastScanPos = pos + 1 - start;
          break;
        }
        pos++;
        continue;
      }

      pos++;
    }
  }

  getMeta() {
    return { ...this.meta };
  }

  getFullBuffer(): string {
    return this.buffer;
  }

  getEmittedNodeCount(): number {
    return this.emittedNodeIds.size;
  }

  getEmittedNodeIds(): string[] {
    return Array.from(this.emittedNodeIds);
  }

  reset(): void {
    this.buffer = '';
    this.emittedNodeIds.clear();
    this.nodesObjectStart = -1;
    this.lastScanPos = 0;
    this.metaExtracted = false;
    this.meta = {};
  }
}
