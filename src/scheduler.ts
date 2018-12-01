import { isNull } from "util";

export type OnTick = () => void;
export class Scheduler {

    private timer: NodeJS.Timeout = null;
    private intervalInMs: number;

    constructor(intervalInSeconds: number, private readonly onTick: OnTick) {
        this.intervalInMs = 1000 * intervalInSeconds;
    }

    public start(): void {
        if (this.isStopped()) {
            this.timer = setInterval(() => this.onTick(), this.intervalInMs);
        }
    }

    public stop(): void {
        if (!this.isStopped()) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    public isStopped(): boolean {
        return this.timer === null;
    }
}