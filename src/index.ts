import type { TLink, TMargin, TNode, TOrientation, TSankeyOptions } from "./typings";
import { select } from "d3-selection";
import { scaleLinear } from "d3-scale";
import { transition } from "d3-transition";

export class Sankey {
  public container: Element = document.querySelector("body") as Element;
  public h: number = 200;
  public links: TLink[] = [];
  public margin: TMargin = { bottom: 20, left: 20, right: 30, top: 20 };
  public nodes: TNode[] = [];
  public orient: TOrientation = "horizontal";
  public padding: number = 5;
  public rh: number = 160;
  public rw: number = 150;
  public size: number = 20;
  public w: number = 200;

  private _extent: [number, number] = [0, 0]; // min/max node values
  private _scale: any;
  private _stepX: number[] = [];              // available gaps across x-axis
  private _stepY: number[] = [];              // available gaps across y-axis
  private _totalLayers: number = 0;

  constructor(options: TSankeyOptions) {
    if (options.margin !== undefined) {
      this.margin = options.margin;
    }

    if (options.container !== undefined) {
      this.container = options.container;
      const box: DOMRect = this.container.getBoundingClientRect();
      this.h = box.height;
      this.w = box.width;
      this.rh = this.h - this.margin.top - this.margin.bottom;
      this.rw = this.w - this.margin.left - this.margin.right;
    }

    if (options.padding !== undefined) {
      this.padding = options.padding;
    }

    if (options.size !== undefined) {
      this.size = options.size;
    }

    if (options.orient !== undefined) {
      this.orient = options.orient;
    }

    this._initNodeLink(options.nodes, options.links);
    this._nodeValueLayer();
    this._calculations();
    this._adjustNodesX();
    this._adjustNodesY();
  }

  public draw(): Sankey {
    const svg = select(this.container).append("svg")
      .attr("height", "100%")
      .attr("width", "100%")
      .attr("viewBox", `0 0 ${this.w} ${this.h}`);

    const defs =  svg.append("defs");

    const clip: any = defs.append("clipPath")
      .attr("clipPathUnits", "userSpaceOnUse")
      .attr("id", "clipcanvas");

    const r: any = clip.append("rect")
      .attr("height", this.rh)
      .attr("width", this.rw)
      .attr("x", 0)
      .attr("y", 0); 

    const canvas = svg.append("g")
      .attr("class", "canvas")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`)
      .attr("clip-path", `url(#clipcanvas)`);

    canvas.append("rect")
      .attr("height", this.rh)
      .attr("width", this.rw)
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", "#ccc");

    const nodes = canvas.append("g")
      .selectAll("g.node")
      .data(this.nodes).enter()
      .append("g")
        .attr("class", "node")
        .attr("transform", d => {
          return this.orient === "horizontal"
            ? `translate(${d.x} ${-this._scale(d.value)})`
            : `translate(${-this._scale(d.value)} ${d.y})`;
        });

    const rect = nodes.append("rect")
      .attr("class", "node")
      .attr("height", d => (this.orient === "horizontal" ? this._scale(d.value) : this.size) + "px")
      .attr("width", d => (this.orient === "horizontal" ? this.size : this._scale(d.value)) + "px")
      .attr("fill", d => d.fill)
      .attr("x", 0)
      .attr("y", 0)
      .style("opacity", 0);

    const t1: any = transition().duration(600);
    rect.transition(t1).delay((d: any) => d.layer * 100)
      .style("opacity", 1);

    nodes.transition(t1)
      .attr("transform", d => `translate(${d.x} ${d.y})`);
    
    rect.append("title")
      .text((d: any) => `${d.name} - ${d.value}`);

    return this;
  }

  public toString(): string {
    let nodes: string = this.nodes.map(n => `${n.name}: ${n.value} (L: ${n.layer})`).join("\n");
    let links: string = this.links.map(l => `${l.nodeIn.name}->${l.nodeOut.name}`).join("\n");
    return `nodes:\n${nodes}\n\nlinks:\n${links}`;
  }

  private _adjustNodesX(): void {
    if (this.orient === "horizontal") {
      this.nodes.forEach((node: TNode) => {
        node.x = node.layer * this._stepX[0];
        if (node.x >= this.rw) {
          node.x -= this.size;
        } else if (node.x < 0) {
          node.x = 0;
        }
      });
    } else {
      let x = 0, layer = 0;
      this.nodes.forEach((node: TNode) => {
        if (layer === node.layer) {
          node.x = x;
          x += this._scale(node.value) + this.padding;
        } else {
          layer = node.layer;
          node.x = 0;
          x = this._scale(node.value) + this.padding;
        }
      });
    }
  }

  private _adjustNodesY(): void {
    if (this.orient === "horizontal") {
      let y = 0, layer = 0;
      this.nodes.forEach((node: TNode) => {
        if (layer === node.layer) {
          node.y = y;
          y += this._scale(node.value) + this.padding;
        } else {
          layer = node.layer;
          node.y = 0;
          y = this._scale(node.value) + this.padding;
        }
      });
    } else {
      this.nodes.forEach((node: TNode) => {
        node.y = node.layer * this._stepY[0];
        if (node.y >= this.rh) {
          node.y -= this.size;
        } else if (node.y < 0) {
          node.y = 0;
        }
      });
    }
  }

  private _calculations(): void {
    this._extent = this.nodes.reduce((ac: [number, number], n) => {
        ac[0] = ( ac[0] === undefined || n.value < ac[0] ) ? n.value : ac[0];
        ac[1] = ( ac[1] === undefined || n.value > ac[1] ) ? n.value : ac[1];
        return ac;
      }, [0, 0]);

    const s = this.nodes.reduce((ac: any, n: TNode) => {ac[n.layer] = (ac[n.layer] || 0) + 1; return ac; }, {});
    for (let [k, v] of Object.entries(s)) {
      if (this.orient === "horizontal") {
        // @ts-ignore
        this._stepY[k] = this.rh / v;
      } else {
        // @ts-ignore
        this._stepX[k] = this.rw / v;
      }
    }
    if (this.orient === "horizontal") {
      this._stepX[0] = this.rw / this._totalLayers;
    } else {
      this._stepY[0] = this.rh / this._totalLayers;
    }

    const rng: [number, number] = this.orient === "horizontal" ? [0, this.rh] : [0, this.rw];
    this._scale = scaleLinear()
      .domain([0, this._extent[1]])
      .range(rng);
  }

  private _initNodeLink(nodes: TNode[], links: TLink[]): void {
    nodes.forEach((node: TNode, i: number) => {
      this.nodes.push({
        fill: node.fill,
        id: i,
        layer: -1,
        linksIn: [],
        linksOut: [],
        name: node.name,
        value: node.value,
        x: 0,
        y: 0
      });
    });

    links.forEach((link: TLink, i: number) => {
      this.links.push({
        nodeIn: this.nodes[link.source],
        nodeOut: this.nodes[link.target],
        source: link.source,
        target: link.target,
        value: link.value
      });
      this.links[i].nodeIn.linksOut.push(this.links[i]);
      this.links[i].nodeOut.linksIn.push(this.links[i]);
    });
  }

  private _nodeValueLayer(): void {
    const track: Map<number, number[]> = new Map();
    let max = 0;
    this.nodes.forEach((node: TNode) => {
      // calculate value if not already provided
      if (node.value === undefined) {
        node.value = Math.max(
          node.linksIn.map(link => link.value).reduce((ac, s) => ac + s, 0),
          node.linksOut.map(link => link.value).reduce((ac, s) => ac + s, 0),
        );
      }

      // calculate layer value
      if (node.linksIn.length === 0) {
        node.layer = 0;
        track.set(node.id, []);
      }
      node.linksOut.forEach((link: TLink) => {  
        if (track.has(link.nodeOut.id)) {
          const parent = track.get(node.id) as number[];
          if (parent.findIndex((e) => e === link.nodeOut.id) === -1) {
            link.nodeOut.layer = node.layer + 1;
            const a = track.get(link.nodeOut.id) as number[];
            a.push(node.id);
            track.set(link.nodeOut.id, a);
          }
        } else {
          link.nodeOut.layer = node.layer + 1;
          track.set(link.nodeOut.id, [node.id]);
        }
        max = link.nodeOut.layer > max ? link.nodeOut.layer : max;
      });
    });

    this._totalLayers = max;
    // final pass to move nodes with no outgoing links to the last layer
    this.nodes.forEach((node: TNode) => {
      if (node.linksOut.length === 0 && node.layer < this._totalLayers) {
        node.layer = this._totalLayers;
      }
    });

    // sort to order by layer and node size
    this.nodes.sort((a, b) => a.layer - b.layer || b.value - a.value);
  }
}