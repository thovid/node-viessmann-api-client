export class Link {
    constructor(link: any) {
        if (Array.isArray(link.rel)) {
            this.rel = link.rel.filter(l => 'string' === typeof l);
        }

        this.href = (link.href as string);
    }
    public readonly rel: string[] = [];
    public readonly href?: string;
}

export interface Properties {
    [key: string]: any;
}

export class Action {
    public readonly method: string;
    public readonly name: string;
    public readonly isExecutable: boolean;
    public readonly type: string;
    public readonly href: string;
    public readonly fields: Field[] = [];
    constructor(action: any) {
        this.method = (action.method as string) || '';
        this.isExecutable = (action.isExecutable as boolean) || false;
        this.name = (action.name as string) || '';
        this.type = (action.type as string) || '';
        this.href = (action.href as string) || '';
        this.fields = (action.fields as Field[]) || [];
    }
}

export interface Field {
    type: string;
    name: string;
    required: boolean;
    [key: string]: any;
}

export class Entity {

    public readonly rel: string[] = [];
    public readonly links: Link[] = [];
    public readonly properties: Properties = {};
    public readonly entities: Entity[] = [];
    public readonly actions: Action[] = [];
    public readonly class: string[] = [];
    public readonly href?: string = undefined;

    constructor(entity: any) {
        if (Array.isArray(entity.rel)) {
            this.rel = entity.rel
                .filter(r => 'string' === typeof r);
        }
        if (Array.isArray(entity.links)) {
            this.links = entity.links
                .filter(l => 'object' === typeof l)
                .map(link => new Link(link));
        }
        this.properties = (entity.properties as Properties) || {};

        if (Array.isArray(entity.class)) {
            this.class = entity.class
                .filter(c => 'string' === typeof c);
        }
        if (Array.isArray(entity.entities)) {
            this.entities = entity.entities
                .filter(e => 'object' === typeof e)
                .map(e => new Entity(e));
        }
        this.href = entity.href as string;

        if (Array.isArray(entity.actions)) {
            this.actions = entity.actions
                .filter(a => 'object' === typeof a)
                .map(a => new Action(a));
        }
    }

    public hasClass(aClass: string): boolean {
        return this.class.indexOf(aClass) > -1;
    }
}
