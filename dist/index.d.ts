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
    private _linkGenerator;
    private _scale;
    private _layerGap;
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
     * Positions links relative to sourcec and destination nodes
     */
    private _positionLinks;
    /**
     * spreads the nodes across the chart space by layer
     */
    private _positionNodeByLayer;
    /**
     * spreads the nodes within layer
     */
    private _positionNodeInLayer;
    /**
     * Sets height and width of node
     */
    private _setNodeSize;
    /**
     * Determines the scale and layer gap of nodes
     */
    private _setScale;
    /**
     * Calculates the chart scale
     */
    private _calcScaling;
    /**
     * Determines the minimum and maximum extent values to scale nodes by
     */
    private _calcScalingExtent;
    private _drawCanvas;
    private _drawLabels;
    private _drawLinks;
    private _drawNodes;
    /**
     * Creates the initial data structures
     */
    private _initDataStructure;
    private _linkClickHandler;
    private _nodeClickHandler;
    /**
     * Determines each node dimension and layer attribution and finally determines node order within layer
     */
    private _nodeValueLayer;
}
