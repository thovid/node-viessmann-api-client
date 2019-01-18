import {log} from './logger';
export type OnTick = () => void;
export class Scheduler {

    private timer: NodeJS.Timeout = null;

    constructor(private readonly intervalInMs: number, private readonly onTick: OnTick) {}

    public start(): void {
        if (this.isStopped()) {
            this.timer = setInterval(() => this.onTick(), this.intervalInMs);
            log('Scheduler started', 'debug');
        }
    }

    public stop(): void {
        if (!this.isStopped()) {
            clearInterval(this.timer);
            this.timer = null;
            log('Scheduler stopped', 'debug');
        }
    }

    public isStopped(): boolean {
        return this.timer === null;
    }
}
