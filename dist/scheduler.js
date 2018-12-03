"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Scheduler {
    constructor(intervalInSeconds, onTick) {
        this.onTick = onTick;
        this.timer = null;
        this.intervalInMs = 1000 * intervalInSeconds;
    }
    start() {
        if (this.isStopped()) {
            this.timer = setInterval(() => this.onTick(), this.intervalInMs);
        }
    }
    stop() {
        if (!this.isStopped()) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    isStopped() {
        return this.timer === null;
    }
}
exports.Scheduler = Scheduler;
//# sourceMappingURL=scheduler.js.map