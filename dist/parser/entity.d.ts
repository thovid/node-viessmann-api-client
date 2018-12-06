export declare class Link {
    constructor(link: any);
    readonly rel: string[];
    readonly href?: string;
}
export declare type Properties = Object;
export declare class Entity {
    constructor(entity: any);
    readonly rel: string[];
    readonly links: Link[];
    readonly properties: Properties;
    readonly entities: Entity[];
    readonly class: string[];
    hasClass(aClass: string): boolean;
    childrenWithClass(aClass: string, recursive?: boolean): Entity[];
    private static flatten;
}
