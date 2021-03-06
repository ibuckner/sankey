import { Basechart, TMargin } from "@buckneri/spline";
export declare type TLink = {
    dom: SVGElement;
    fill: string;
    id: string;
    nodeIn: TNode;
    nodeOut: TNode;
    source: number;
    story: string;
    target: number;
    value: number;
    w: number;
    y0: number;
    y1: number;
};
export declare type TNode = {
    dom: SVGElement;
    fill: string;
    h: number;
    id: number;
    layer: number;
    linksIn: TLink[];
    linksOut: TLink[];
    name: string;
    story: string;
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
    playback: boolean;
};
export declare class Sankey extends Basechart {
    links: TLink[];
    nodeMoveX: boolean;
    nodeMoveY: boolean;
    nodes: TNode[];
    nodeSize: number;
    orient: TOrientation;
    padding: number;
    playback: boolean;
    private _extent;
    private _fp;
    private _linkGenerator;
    private _layerGap;
    private _totalLayers;
    constructor(options: TSankeyOptions);
    /**
     * Saves data into Sankey
     * @param nodes - Sankey nodes
     * @param links - Sankey links
     */
    data(nodes: TNode[], links: TLink[]): Sankey;
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
    private _drawCanvas;
    private _drawLabels;
    private _drawLinks;
    private _drawNodes;
    private _drawPlayback;
    /**
     * Creates the initial data structures
     */
    private _initDataStructure;
    private _linkClickHandler;
    private _nodeClickHandler;
    private _playbackClickHandler;
    /**
     * Sets height and width of node
     */
    private _nodeSize;
    /**
     * Determines each node dimension and layer attribution and finally determines node order within layer
     */
    private _nodeValueLayer;
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
     * Calculates the chart scale
     */
    private _scaling;
    /**
     * Determines the minimum and maximum extent values to scale nodes by
     */
    private _scalingExtent;
}
