export declare type OnTick = () => void;
export declare class Scheduler {
    private readonly onTick;
    private timer;
    private intervalInMs;
    constructor(intervalInSeconds: number, onTick: OnTick);
    start(): void;
    stop(): void;
    isStopped(): boolean;
}
