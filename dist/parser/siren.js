"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Link {
    constructor(link) {
        this.rel = [];
        if (Array.isArray(link.rel)) {
            this.rel = link.rel.filter(l => 'string' === typeof l);
        }
        this.href = link.href;
    }
}
exports.Link = Link;
class Action {
    constructor(action) {
        this.fields = [];
        this.method = action.method || '';
        this.isExecutable = action.isExecutable || false;
        this.name = action.name || '';
        this.type = action.type || '';
        this.href = action.href || '';
        this.fields = action.fields || [];
    }
}
exports.Action = Action;
class Entity {
    constructor(entity) {
        this.rel = [];
        this.links = [];
        this.properties = {};
        this.entities = [];
        this.actions = [];
        this.class = [];
        this.href = undefined;
        if (Array.isArray(entity.rel)) {
            this.rel = entity.rel
                .filter(r => 'string' === typeof r);
        }
        if (Array.isArray(entity.links)) {
            this.links = entity.links
                .filter(l => 'object' === typeof l)
                .map(link => new Link(link));
        }
        this.properties = entity.properties || {};
        if (Array.isArray(entity.class)) {
            this.class = entity.class
                .filter(c => 'string' === typeof c);
        }
        if (Array.isArray(entity.entities)) {
            this.entities = entity.entities
                .filter(e => 'object' === typeof e)
                .map(e => new Entity(e));
        }
        this.href = entity.href;
        if (Array.isArray(entity.actions)) {
            this.actions = entity.actions
                .filter(a => 'object' === typeof a)
                .map(a => new Action(a));
        }
    }
    hasClass(aClass) {
        return this.class.indexOf(aClass) > -1;
    }
}
exports.Entity = Entity;
//# sourceMappingURL=siren.js.map