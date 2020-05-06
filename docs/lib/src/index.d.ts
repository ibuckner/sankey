export declare type TLink = {
    fill: string;
    nodeIn: TNode;
    nodeOut: TNode;
    source: number;
    target: number;
    value: number;
    w: number;
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
    nodeMoveX: boolean;
    nodeMoveY: boolean;
    nodes: TNode[];
    nodeSize: number;
    orient: TOrientation;
    padding: number;
};
export declare class Sankey {
    container: HTMLElement;
    h: number;
    linkGenerator: Function;
    links: TLink[];
    margin: TMargin;
    nodeMoveX: boolean;
    nodeMoveY: boolean;
    nodes: TNode[];
    nodeSize: number;
    orient: TOrientation;
    padding: number;
    rh: number;
    rw: number;
    w: number;
    private _extent;
    private _scale;
    private _stepX;
    private _stepY;
    private _totalLayers;
    constructor(options: TSankeyOptions);
    /**
     * Clears selection from Sankey
     */
    clearSelection(): Sankey;
    /**
     * Saves data into Sankey
     * @param nodes - Sankey nodes
     * @param links - Sankey links
     */
    data(nodes: TNode[], links: TLink[]): Sankey;
    /**
     * Removes this chart from the DOM
     */
    destroy(): Sankey;
    /**
     * draws the Sankey
     */
    draw(): Sankey;
    /**
     * Recalculate internal values
     */
    initialise(): Sankey;
    /**
     * Serialise the Sankey data
     */
    toString(): string;
    /**
     * Currently in horizontal orientations
     * y0 is the top y value of link at source node
     * y1 is the bottom y value of link at target node
     */
    private _adjustLinks;
    private _adjustNodesHX;
    private _adjustNodesHY;
    private _adjustNodesVX;
    private _adjustNodesVY;
    private _calculations;
    private _drawCanvas;
    private _drawLabels;
    private _drawLinks;
    private _drawNodes;
    private _initNodeLink;
    private _linkClickHandler;
    private _nodeClickHandler;
    private _nodeValueLayer;
}
