export declare class Link {
    constructor(link: any);
    readonly rel: string[];
    readonly href?: string;
}
export declare type Properties = any;
export declare class Entity {
    readonly rel: string[];
    readonly links: Link[];
    readonly properties: Properties;
    readonly entities: Entity[];
    readonly class: string[];
    readonly href?: string;
    constructor(entity: any);
    hasClass(aClass: string): boolean;
}
