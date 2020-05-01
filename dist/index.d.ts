export declare type TLink = {
    fill: string;
    nodeIn: TNode;
    nodeOut: TNode;
    source: number;
    target: number;
    value: number;
    width: number;
    y0: number;
    y1: number;
};
export declare type TMargin = {
    bottom: number;
    left: number;
    right: number;
    top: number;
};
export declare type TNode = {
    fill: string;
    h: number;
    id: number;
    layer: number;
    linksIn: TLink[];
    linksOut: TLink[];
    name: string;
    value: number;
    w: number;
    x: number;
    y: number;
};
export declare type TOrientation = "horizontal" | "vertical";
export declare type TSankeyOptions = {
    container: HTMLElement;
    links: TLink[];
    margin: TMargin;
    nodes: TNode[];
    orient: TOrientation;
    padding: number;
    size: number;
};
export declare class Sankey {
    container: HTMLElement;
    h: number;
    linkGenerator: Function;
    links: TLink[];
    margin: TMargin;
    nodes: TNode[];
    orient: TOrientation;
    padding: number;
    rh: number;
    rw: number;
    size: number;
    w: number;
    private _extent;
    private _scale;
    private _stepX;
    private _stepY;
    private _totalLayers;
    constructor(options: TSankeyOptions);
    data(nodes: TNode[], links: TLink[]): Sankey;
    clear(): Sankey;
    clearSelection(): Sankey;
    draw(): Sankey;
    drawCanvas(): any;
    drawLabels(): any;
    drawLinks(): any;
    drawNodes(): any;
    initialise(): Sankey;
    linkClickHandler(el: Element): void;
    nodeClickHandler(el: Element): void;
    redraw(): Sankey;
    toString(): string;
    /**
     * Currently in horizontal orientations
     * y0 is the top y value of link at source node
     * y1 is the bottom y value of link at target node
     */
    private _adjustLinks;
    private _adjustNodesX;
    private _adjustNodesY;
    private _calculations;
    private _initNodeLink;
    private _nodeValueLayer;
}
