export declare type OnTick = () => void;
export declare class Scheduler {
    private readonly intervalInMs;
    private readonly onTick;
    private timer;
    constructor(intervalInMs: number, onTick: OnTick);
    start(): void;
    stop(): void;
    isStopped(): boolean;
}
