
export class Link {
    constructor(link: any) {
        if (link.rel && Array.isArray(link.rel)) {
            this.rel = (<any[]>link.rel).filter(l => 'string' === typeof l);
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

    constructor(entity: any) {
        if (entity.rel && Array.isArray(entity.rel)) {
            this.rel = (<any[]>entity.rel)
                .filter(r => 'string' === typeof r);
        } else {
            this.rel = [];
        }
        if (entity.links && Array.isArray(entity.links)) {
            this.links = (<any[]>entity.links)
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
            this.class = (<any[]>entity.class)
                .filter(c => 'string' === typeof c);
        } else {
            this.class = [];
        }

        if (entity.entities && Array.isArray(entity.entities)) {
            this.entities = (<any[]>entity.entities)
                .filter(e => 'object' === typeof e)
                .map(e => new Entity(e));
        } else {
            this.entities = [];
        }

        if(entity.href && 'string' === typeof entity.href) {
            this.href = entity.href;
        } else {
            this.href = undefined;
        }
    };

    public readonly rel: string[];
    public readonly links: Link[];
    public readonly properties: Properties;
    public readonly entities: Entity[];
    public readonly class: string[];
    public readonly href?: string;

    public hasClass(aClass: string): boolean {
        return this.class.indexOf(aClass) > -1;
    }

    public childrenWithClass(aClass: string, recursive: boolean = false): Entity[] {
        const grandChildren = recursive ?
            this.entities
                .map(e => e.childrenWithClass(aClass, true))
            : [];
        const children = this.entities
            .filter(e => e.hasClass(aClass));

        return Entity.flatten(grandChildren, children);
    }

    private static flatten<P>(arr: any[], result: P[] = []): P[] {
        for (let i = 0, length = arr.length; i < length; i++) {
            const value = (arr[i] as P);
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    this.flatten(value, result);
                } else {
                    result.push(value);
                }
            }
        }
        return result;
    };
}