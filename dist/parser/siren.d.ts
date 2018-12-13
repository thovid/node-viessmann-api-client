export declare class Link {
    constructor(link: any);
    readonly rel: string[];
    readonly href?: string;
}
export declare type Properties = any;
export declare class Action {
    readonly method: string;
    readonly name: string;
    readonly isExecutable: boolean;
    readonly type: string;
    readonly href: string;
    readonly fields: Field[];
    constructor(action: any);
}
export interface Field {
    type: string;
    name: string;
    required: boolean;
}
export declare class Entity {
    readonly rel: string[];
    readonly links: Link[];
    readonly properties: Properties;
    readonly entities: Entity[];
    readonly actions: Action[];
    readonly class: string[];
    readonly href?: string;
    constructor(entity: any);
    hasClass(aClass: string): boolean;
}
