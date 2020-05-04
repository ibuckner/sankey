import { event, select, selectAll } from "d3-selection";
import { scaleLinear } from "d3-scale";
import { transition } from "d3-transition";
import { format } from "d3-format";
import { linkHorizontal, linkVertical } from "d3-shape";
import { drag } from "d3-drag";
import { svg } from "@buckneri/spline";

export type TLink = {
  fill: string, nodeIn: TNode, nodeOut: TNode, source: number, target: number,
  value: number, width: number, y0: number, y1: number
};

export type TMargin = { bottom: number, left: number, right: number, top: number };

export type TNode = {
  fill: string, h: number, id: number, layer: number, 
  linksIn: TLink[], linksOut: TLink[], name: string, value: number, 
  w: number, x: number, y: number
};

export type TOrientation = "horizontal" | "vertical";

export type TSankeyOptions = {
  container: HTMLElement, links: TLink[], margin: TMargin, nodes: TNode[],
  orient: TOrientation, // determines node alignment
  padding: number,      // minimum distance between node neighbours
  size: number          // minimum node size
};

const format2 = format(",.2f"), format1 = format(",.1f"), format0 = format(",.0f");
function formatNumber(v: number): string {
	return v < 1 ? format2(v) : v < 10 ? format1(v) : format0(v);
}

export class Sankey {
  public container: HTMLElement = document.querySelector("body") as HTMLElement;
  public h: number = 200;
  public linkGenerator: Function = () => true;
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
    
    this.data(options.nodes, options.links)
        .initialise();
  }

  public data(nodes: TNode[], links: TLink[]): Sankey {
    this._initNodeLink(nodes, links);
    return this;
  }

  public canvasClickHandler(el: Element) {
    event.stopPropagation();
    this.clearSelection();
    window.dispatchEvent(new CustomEvent("clear-selected", { detail: el }));
  }

  public clear(): Sankey {
    select(this.container).select("svg").remove();
    return this;
  }

  public clearSelection(): Sankey {
    selectAll(".selected").classed("selected", false);
    return this;
  }

  public draw(): Sankey {
    this.drawCanvas();
    this.drawLinks();
    this.drawNodes();
    this.drawLabels();
    return this;
  }

  public drawCanvas(): any {
    const sg: SVGElement = svg(this.container, {
      height: this.h, 
      margin: this.margin,
      width: this.w
    }) as any;
    select(sg).on("click", () => this.clearSelection());
  }

  public drawLabels(): any {
    const canvas = select(this.container).select(".canvas");
    const nodes = canvas.selectAll("g.node");

    const outerLabel = nodes.append("text")
      .attr("class", "node-label")
      .attr("dy", "0.35em")
      .attr("opacity", 0);

    if (this.orient === "horizontal") {
      outerLabel
        .attr("x", (d: any) => d.x < (this.rw / 2) ? this.size + 6 : -6)
        .attr("y", (d: any) => this._scale(d.value) / 2)
        .attr("text-anchor", (d: any) => d.x + this.size > this.rw / 2 ? "end" : "start")
        .style("opacity", (d: any) => this._scale(d.value) > 20 ? null : 0)
        .text((d: any) => d.name);
    } else {
      outerLabel
        .attr("x", (d: any) => this._scale(d.value) / 2)
        .attr("y", (d: any) => d.y < (this.rh / 2) ? this.size + 10 : - 10)
        .attr("text-anchor", "middle")
        .text((d: any) => this._scale(d.value) > d.name.length * 7 ? d.name : "");
    }

    const innerLabel = nodes.append("text")
      .attr("class", "node-label")
      .attr("dy", "0.35em")
      .attr("opacity", 0);

    if (this.orient === "horizontal") {
      innerLabel
        .attr("x", (d: any) => -this._scale(d.value) / 2)
        .attr("y", (d: any) => this.size / 2)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(270)")
        .text((d: any) => this._scale(d.value) > 50 ? formatNumber(d.value) : "");
    } else {
      innerLabel
        .attr("x", (d: any) => this._scale(d.value) / 2)
        .attr("y", (d: any) => this.size / 2)
        .attr("text-anchor", "middle")
        .text((d: any) => this._scale(d.value) > 50 ? formatNumber(d.value) : "");
    }

    const t1: any = transition().duration(600);
    if ( this.orient === "horizontal") {
      outerLabel.transition(t1).delay(1000).style("opacity", (d: any) => d.h > 50 ? 1 : 0);
      innerLabel.transition(t1).delay(1000).style("opacity", (d: any) => d.h > 50 ? 1 : 0);
    } else {
      outerLabel.transition(t1).delay(1000).style("opacity", (d: any) => d.w > 50 ? 1 : 0);
      innerLabel.transition(t1).delay(1000).style("opacity", (d: any) => d.w > 50 ? 1 : 0);
    }
  }

  public drawLinks(): any {
    const canvas = select(this.container).select(".canvas");
    if (this.orient === "horizontal") {
      this.linkGenerator = linkHorizontal()
        .source((d: any) => [d.nodeIn.x + this.size, d.y0])
        .target((d: any) => [d.nodeOut.x, d.y1])
        .x((d: any) => d[0])
        .y((d: any) => d[1]);
    } else {
      this.linkGenerator = linkVertical()
        .source((d: any) => [d.y0, d.nodeIn.y + this.size])
        .target((d: any) => [d.y1, d.nodeOut.y])
        .x((d: any) => d[0])
        .y((d: any) => d[1]);
    }

    const linkCollection = canvas.append("g")
      .selectAll("g")
      .data(this.links)
      .enter()
      .append("g")
        .attr("class", "link")
        .on("click", (d: TLink) => this.linkClickHandler(event.target));

    const path = linkCollection
      .append("path")
        .attr("class", "link")
        .attr("stroke", (d: any) => d.fill ? d.fill : d.nodeIn.fill)
        .attr("stroke-width", (d: TLink) => d.width)
        .attr("fill", "none");

    linkCollection.append("title")
      .text((d: TLink) => `${d.nodeIn.name} -> ${d.nodeOut.name} - ${formatNumber(d.value)}`);

    const t: any = transition().duration(600);
    path.transition(t).delay(1000)
      // @ts-ignore
      .attr("d", d => this.linkGenerator(d));
  }

  public drawNodes(): any {
    const self = this;
    const canvas = select(this.container).select(".canvas");

    const nodes = canvas.append("g")
      .selectAll("g.node")
      .data(this.nodes).enter()
      .append("g")
        .attr("class", "node")
        .attr("transform", d => {
          return this.orient === "horizontal"
            ? `translate(${d.x},${-d.h})`
            : `translate(${-d.w},${d.y})`;
        })
        .call(
          // @ts-ignore
          drag().clickDistance(1)
            .on("start", dragstart)
            .on("drag", dragmove as any)
            .on("end", dragend))
        .on("click", () => this.nodeClickHandler(event.currentTarget));

    const rect = nodes.append("rect")
      .attr("class", "node")
      .attr("height", (d: TNode) => (this.orient === "horizontal" ? this._scale(d.value) : this.size) + "px")
      .attr("width", (d: TNode) => (this.orient === "horizontal" ? this.size : this._scale(d.value)) + "px")
      .attr("fill", (d: TNode) => d.fill)
      .attr("x", 0)
      .attr("y", 0)
      .style("opacity", 0);

    const t1: any = transition().duration(600);
    rect.transition(t1).delay((d: any) => d.layer * 100)
      .style("opacity", 1);

    nodes.transition(t1)
      .attr("transform", (d: TNode) => `translate(${d.x} ${d.y})`);
    
    nodes.append("title")
      .text((d: any) => `${d.name} - ${formatNumber(d.value)}`);

    function dragstart(d: any) {
      if (!d.__x) { d.__x = event.x; }
      if (!d.__y) { d.__y = event.y; }
      if (!d.__x0) { d.__x0 = d.x; }
      if (!d.__y0) { d.__y0 = d.y; }
    }

    function dragmove(this: SVGGElement, d: any) {
      select(this)
        .attr("transform", function (d: any) {
          const dx = event.x - d.__x;
          const dy = event.y - d.__y;
          // x direction
          d.x = d.__x0 + dx;
          if (d.x < 0) {
            d.x = 0;
          }
          // y direction
          d.y = d.__y0 + dy;
          if (d.y < 0) {
            d.y = 0;
          }
          
          return `translate(${d.x}, ${d.y})`;
        });
  
      self._adjustLinks();
      selectAll("path.link")
        .attr("d", d => self.linkGenerator(d));
    }

    function dragend(d: any) {
      delete d.__x;
      delete d.__y;
      delete d.__x0;
      delete d.__x1;
      delete d.__y0;
      delete d.__y1;
    }
  }

  public initialise(): Sankey {
    this._nodeValueLayer();
    this._calculations();
    this._adjustNodesX();
    this._adjustNodesY();
    this._adjustLinks();
    return this;
  }

  public linkClickHandler(el: Element) {
    event.stopPropagation();
    this.clearSelection();
    window.dispatchEvent(new CustomEvent("link-selected", { detail: el }));
    select(el).classed("selected", true);
  }

  public nodeClickHandler(el: Element) {
    event.stopPropagation();
    this.clearSelection();
    const dt = select(el).datum();
    window.dispatchEvent(new CustomEvent("node-selected", { detail: el }));
    selectAll("g.link")
      .each((d: any, i: number, n: any) => {
        if (d.nodeIn === dt || d.nodeOut === dt) {
          select(n[i]).select("path").classed("selected", true);
        }
      });
  }

  public redraw(): Sankey {
    this.clear().initialise().draw();
    return this;
  }

  public toString(): string {
    let nodes: string = this.nodes.map(n => `${n.name}: ${n.value} (L: ${n.layer})`).join("\n");
    let links: string = this.links.map(l => `${l.nodeIn.name}->${l.nodeOut.name}`).join("\n");
    return `nodes:\n${nodes}\n\nlinks:\n${links}`;
  }

  /**
   * Currently in horizontal orientations
   * y0 is the top y value of link at source node
   * y1 is the bottom y value of link at target node
   */
  private _adjustLinks(): void {
    // sort: by size then by a-z name
    this.links.sort((a, b) => b.value - a.value || (b.nodeIn.name > a.nodeIn.name ? -1 : 1));

    const source = new Map<number, number>();
    const target = new Map<number, number>();

    this.links.forEach((link: TLink) => {
      let src = 0, tgt = 0;
      link.width = Math.max(1, this._scale(link.value));   
      if (!source.has(link.nodeIn.id)) {
        source.set(link.nodeIn.id, (this.orient === "horizontal") ? link.nodeIn.y : link.nodeIn.x);
      }
      if (!target.has(link.nodeOut.id)) {
        target.set(link.nodeOut.id, (this.orient === "horizontal") ? link.nodeOut.y : link.nodeOut.x);
      }
      src = source.get(link.nodeIn.id) as number;
      link.y0 = src + (link.width / 2);
      tgt = target.get(link.nodeOut.id) as number;
      link.y1 = tgt + (link.width / 2);
      source.set(link.nodeIn.id, link.y0 + (link.width / 2));
      target.set(link.nodeOut.id, link.y1 + (link.width / 2));
    });
  }

  private _adjustNodesX(): void {
    if (this.orient === "horizontal") {
      this.nodes.forEach((node: TNode) => {
        node.h = this._scale(node.value);
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
        node.w = this._scale(node.value);
        if (layer === node.layer) {
          node.x = x;
          x += node.w+ this.padding;
        } else {
          layer = node.layer;
          node.x = 0;
          x = node.w + this.padding;
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
          y += node.h + this.padding;
        } else {
          layer = node.layer;
          node.y = 0;
          y = node.h + this.padding;
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
        h: this.orient === "horizontal" ? 0 : this.size,
        id: i,
        layer: -1,
        linksIn: [],
        linksOut: [],
        name: node.name,
        value: node.value,
        w: this.orient === "horizontal" ? this.size : 0,
        x: 0,
        y: 0
      });
    });

    links.forEach((link: TLink, i: number) => {
      this.links.push({
        fill: link.fill,
        nodeIn: this.nodes[link.source],
        nodeOut: this.nodes[link.target],
        source: link.source,
        target: link.target,
        value: link.value,
        width: 0,
        y0: 0,
        y1: 0
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

    // sort: by layer asc then by size then by a-z name
    this.nodes.sort((a, b) => a.layer - b.layer || b.value - a.value || (b.name > a.name ? -1 : 1));
  }
}