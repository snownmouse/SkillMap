import { logger } from '../utils/logger';

interface QueuedTask {
  id: string;
  task: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

export class MessageBufferService {
  private taskQueue: QueuedTask[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 100;
  private flushInterval = 50;

  constructor() {
    this.startFlushLoop();
  }

  private startFlushLoop() {
    setInterval(() => {
      if (!this.isProcessing && this.taskQueue.length > 0) {
        this.processQueue();
      }
    }, this.flushInterval);
  }

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.taskQueue.push({
        id: taskId,
        task,
        resolve,
        reject
      });
      
      logger.debug('[Buffer] 任务入队', { 
        taskId, 
        queueLength: this.taskQueue.length 
      });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.taskQueue.length > 0) {
        const queuedTask = this.taskQueue.shift()!;
        
        logger.debug('[Buffer] 开始处理任务', { 
          taskId: queuedTask.id, 
          remainingTasks: this.taskQueue.length 
        });

        try {
          const result = await this.executeWithRetry(queuedTask.task);
          queuedTask.resolve(result);
          logger.debug('[Buffer] 任务完成', { taskId: queuedTask.id });
        } catch (error) {
          logger.error('[Buffer] 任务执行失败', { 
            taskId: queuedTask.id, 
            error 
          });
          queuedTask.reject(error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeWithRetry<T>(task: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt;
          logger.warn('[Buffer] 任务执行失败，重试中', { 
            attempt, 
            maxRetries: this.maxRetries, 
            delay 
          });
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQueueLength(): number {
    return this.taskQueue.length;
  }

  isBusy(): boolean {
    return this.isProcessing || this.taskQueue.length > 0;
  }

  getStatus() {
    return {
      queueLength: this.taskQueue.length,
      isProcessing: this.isProcessing,
      maxRetries: this.maxRetries,
      flushInterval: this.flushInterval
    };
  }

  setMaxRetries(retries: number) {
    this.maxRetries = retries;
  }

  setFlushInterval(interval: number) {
    this.flushInterval = interval;
  }
}

const messageBufferService = new MessageBufferService();
export { messageBufferService };
