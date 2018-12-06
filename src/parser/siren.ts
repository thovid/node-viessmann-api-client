
export class Link {
    constructor(link: any) {
        if (link.rel && Array.isArray(link.rel)) {
            this.rel = (link.rel as any[]).filter(l => 'string' === typeof l);
        } else {
            this.rel = [];
        }

        if (link.href && 'string' === typeof link.href) {
            this.href = link.href;
        } else {
            this.href = undefined;
        }
    }
    public readonly rel: string[];
    public readonly href?: string;
}

export type Properties = any;

export class Entity {

    public readonly rel: string[];
    public readonly links: Link[];
    public readonly properties: Properties;
    public readonly entities: Entity[];
    public readonly class: string[];
    public readonly href?: string;

    constructor(entity: any) {
        if (entity.rel && Array.isArray(entity.rel)) {
            this.rel = (entity.rel as any[])
                .filter(r => 'string' === typeof r);
        } else {
            this.rel = [];
        }
        if (entity.links && Array.isArray(entity.links)) {
            this.links = (entity.links as any[])
                .filter(l => 'object' === typeof l)
                .map(link => new Link(link));
        } else {
            this.links = [];
        }

        if (entity.properties && 'object' === typeof entity.properties) {
            this.properties = entity.properties;
        } else {
            this.properties = {};
        }

        if (entity.class && Array.isArray(entity.class)) {
            this.class = (entity.class as any[])
                .filter(c => 'string' === typeof c);
        } else {
            this.class = [];
        }

        if (entity.entities && Array.isArray(entity.entities)) {
            this.entities = (entity.entities as any[])
                .filter(e => 'object' === typeof e)
                .map(e => new Entity(e));
        } else {
            this.entities = [];
        }

        if (entity.href && 'string' === typeof entity.href) {
            this.href = entity.href;
        } else {
            this.href = undefined;
        }
    }

    public hasClass(aClass: string): boolean {
        return this.class.indexOf(aClass) > -1;
    }
}
