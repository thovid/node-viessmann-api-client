"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
class Scheduler {
    constructor(intervalInMs, onTick) {
        this.intervalInMs = intervalInMs;
        this.onTick = onTick;
        this.timer = null;
    }
    start() {
        if (this.isStopped()) {
            this.timer = setInterval(() => this.onTick(), this.intervalInMs);
            logger_1.log('Scheduler started', 'debug');
        }
    }
    stop() {
        if (!this.isStopped()) {
            clearInterval(this.timer);
            this.timer = null;
            logger_1.log('Scheduler stopped', 'debug');
        }
    }
    isStopped() {
        return this.timer === null;
    }
}
exports.Scheduler = Scheduler;
//# sourceMappingURL=scheduler.js.map