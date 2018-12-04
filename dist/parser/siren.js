"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Link {
    constructor(link) {
        if (link.rel && Array.isArray(link.rel)) {
            this.rel = link.rel.filter(l => 'string' === typeof l);
        }
        else {
            this.rel = [];
        }
        if (link.href && 'string' === typeof link.href) {
            this.href = link.href;
        }
        else {
            this.href = undefined;
        }
    }
}
exports.Link = Link;
class Entity {
    constructor(entity) {
        if (entity.rel && Array.isArray(entity.rel)) {
            this.rel = entity.rel
                .filter(r => 'string' === typeof r);
        }
        else {
            this.rel = [];
        }
        if (entity.links && Array.isArray(entity.links)) {
            this.links = entity.links
                .filter(l => 'object' === typeof l)
                .map(link => new Link(link));
        }
        else {
            this.links = [];
        }
        if (entity.properties && 'object' === typeof entity.properties) {
            this.properties = entity.properties;
        }
        else {
            this.properties = {};
        }
        if (entity.class && Array.isArray(entity.class)) {
            this.class = entity.class
                .filter(c => 'string' === typeof c);
        }
        else {
            this.class = [];
        }
        if (entity.entities && Array.isArray(entity.entities)) {
            this.entities = entity.entities
                .filter(e => 'object' === typeof e)
                .map(e => new Entity(e));
        }
        else {
            this.entities = [];
        }
        if (entity.href && 'string' === typeof entity.href) {
            this.href = entity.href;
        }
        else {
            this.href = undefined;
        }
    }
    ;
    hasClass(aClass) {
        return this.class.indexOf(aClass) > -1;
    }
    childrenWithClass(aClass, recursive = false) {
        const grandChildren = recursive ?
            this.entities
                .map(e => e.childrenWithClass(aClass, true))
            : [];
        const children = this.entities
            .filter(e => e.hasClass(aClass));
        return Entity.flatten(grandChildren, children);
    }
    static flatten(arr, result = []) {
        for (let i = 0, length = arr.length; i < length; i++) {
            const value = arr[i];
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    this.flatten(value, result);
                }
                else {
                    result.push(value);
                }
            }
        }
        return result;
    }
    ;
}
exports.Entity = Entity;
//# sourceMappingURL=siren.js.map