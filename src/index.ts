import { event, select, selectAll } from "d3-selection";
import { scaleLinear } from "d3-scale";
import { transition } from "d3-transition";
import { linkHorizontal, linkVertical } from "d3-shape";
import { drag } from "d3-drag";
import { formatNumber, measure, svg, TMargin } from "@buckneri/spline";

export type TLink = {
  fill: string, 
  id: string, 
  nodeIn: TNode, 
  nodeOut: TNode, 
  source: number,
  story: string,
  target: number,
  value: number, 
  w: number, 
  y0: number, 
  y1: number
};

export type TNode = {
  fill: string,
  h: number,
  id: number, 
  layer: number, 
  linksIn: TLink[],
  linksOut: TLink[], 
  name: string, 
  story: string,
  value: number, 
  w: number, 
  x: number, 
  y: number
};

export type TOrientation = "horizontal" | "vertical";

export type TSankeyOptions = {
  container: HTMLElement,
  links: TLink[],
  margin: TMargin,
  nodeMoveX: boolean,   // allow user movement on node
  nodeMoveY: boolean,
  nodes: TNode[],
  nodeSize: number      // minimum node size
  orient: TOrientation, // determines node alignment
  padding: number,      // minimum distance between node neighbours
  playback: boolean,    // changes the visualisation mode
  playbackDelay: string // animation delay between slide playback
};

export class Sankey {
  public container: HTMLElement = document.querySelector("body") as HTMLElement;
  public h: number = 200;
  public links: TLink[] = [];
  public margin: TMargin = { bottom: 20, left: 20, right: 30, top: 20 };
  public nodeMoveX: boolean = true;
  public nodeMoveY: boolean = true;
  public nodes: TNode[] = [];
  public nodeSize: number = 20;
  public orient: TOrientation = "horizontal";
  public padding: number = 5;
  public playback: boolean = false;
  public playbackDelay: string = "3s";
  public rh: number = 160;
  public rw: number = 150;
  public w: number = 200;

  private _extent: [number, number] = [0, 0]; // min/max node values
  private _linkGenerator: Function = () => true;
  private _playing: boolean = false;
  private _scale: any;
  private _layerGap: number = 0;
  private _totalLayers: number = 0;

  constructor(options: TSankeyOptions) {
    if (options.margin !== undefined) {
      let m = options.margin;
      m.left = isNaN(m.left) ? 0 : m.left;
      m.right = isNaN(m.right) ? 0 : m.right;
      m.top = isNaN(m.top) ? 0 : m.top;
      m.bottom = isNaN(m.bottom) ? 0 : m.bottom;
      this.margin = m;
    }

    if (options.container !== undefined) {
      this.container = options.container;
      const box: DOMRect = measure(this.container);
      this.h = box.height;
      this.w = box.width;
      this.rh = this.h - this.margin.top - this.margin.bottom;
      this.rw = this.w - this.margin.left - this.margin.right;
    }

    if (options.padding !== undefined) {
      this.padding = options.padding;
    }

    if (options.nodeMoveX !== undefined) {
      this.nodeMoveX = options.nodeMoveX;
    }

    if (options.nodeMoveY !== undefined) {
      this.nodeMoveY = options.nodeMoveY;
    }

    if (options.nodeSize !== undefined) {
      this.nodeSize = options.nodeSize;
    }

    if (options.orient !== undefined) {
      this.orient = options.orient;
    }

    if (options.playback !== undefined) {
      this.playback = options.playback;
    }

    if (options.playbackDelay !== undefined) {
      this.playbackDelay = options.playbackDelay;
    }
    
    this.data(options.nodes, options.links)
        .initialise();
  }

  /**
   * Clears selection from Sankey
   */
  public clearSelection(): Sankey {
    selectAll(".selected").classed("selected", false);
    return this;
  }

  /**
   * Saves data into Sankey
   * @param nodes - Sankey nodes
   * @param links - Sankey links
   */
  public data(nodes: TNode[], links: TLink[]): Sankey {
    this._initDataStructure(nodes, links);
    return this;
  }

  /**
   * Removes this chart from the DOM
   */
  public destroy(): Sankey {
    select(this.container).select("svg").remove();
    return this;
  }

  /**
   * draws the Sankey
   */
  public draw(): Sankey {
    this._drawCanvas()
        ._drawNodes()
        ._drawLinks()
        ._drawLabels()
        ._drawMisc();
    return this;
  }

  /**
   * Recalculate internal values
   */
  public initialise(): Sankey {
    this._nodeValueLayer()
        ._scalingExtent()
        ._scaling()
        ._nodeSize()
        ._positionNodeByLayer()
        ._positionNodeInLayer()
        ._positionLinks();
    return this;
  }

  /**
   * Serialise the Sankey data
   */
  public toString(): string {
    let nodes: string = this.nodes.map(n => `${n.name}: ${n.value} (L: ${n.layer})`).join("\n");
    let links: string = this.links.map(l => `${l.nodeIn.name}->${l.nodeOut.name}`).join("\n");
    return `nodes:\n${nodes}\n\nlinks:\n${links}`;
  }

  // ***** PRIVATE METHODS

  private _drawCanvas(): Sankey {
    const sg: SVGElement = svg(this.container, {
      height: this.h, 
      margin: this.margin,
      width: this.w
    }) as any;
    sg.classList.add("sankey");
    sg.id = "sankey" + Array.from(document.querySelectorAll(".sankey")).length;
    select(sg).on("click", () => this.clearSelection());

    return this;
  }

  private _drawLabels(): Sankey {
    const canvas = select(this.container).select(".canvas");
    const nodes = canvas.selectAll("g.node");
    const fade = this.playback ? " shadow" : "";

    const outerLabel = nodes.append("text")
      .attr("class", (d: any) => "node-label outer" + (d.layer > 0 ? fade : ""))
      .attr("dy", "0.35em")
      .attr("opacity", 0);

    if (this.orient === "horizontal") {
      outerLabel
        .attr("x", (d: any) => d.x < (this.rw / 2) ? this.nodeSize + 6 : -6)
        .attr("y", (d: any) => d.h / 2)
        .attr("text-anchor", (d: any) => d.x + this.nodeSize > this.rw / 2 ? "end" : "start")
        .style("opacity", (d: any) => d.h > 20 ? null : 0)
        .text((d: any) => d.name);
    } else {
      outerLabel
        .attr("x", (d: any) => d.w / 2)
        .attr("y", (d: any) => d.y < (this.rh / 2) ? this.nodeSize + 10 : - 10)
        .attr("text-anchor", "middle")
        .text((d: any) => d.w > d.name.length * 7 ? d.name : "");
    }

    const innerLabel = nodes.append("text")
      .attr("class", (d: any) => "node-label inner" + (d.layer > 0 ? fade : ""))
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("opacity", 0);

    if (this.orient === "horizontal") {
      innerLabel
        .attr("x", (d: any) => -d.h / 2)
        .attr("y", () => this.nodeSize / 2)
        .attr("transform", "rotate(270)")
        .text((d: any) => d.h > 50 ? formatNumber(d.value) : "");
    } else {
      innerLabel
        .attr("x", (d: any) => d.w / 2)
        .attr("y", () => this.nodeSize / 2)
        .text((d: any) => d.w > 50 ? formatNumber(d.value) : "");
    }

    const t1: any = transition().duration(600);
    if ( this.orient === "horizontal") {
      outerLabel.transition(t1).delay(1000).style("opacity", (d: any) => d.h > 50 ? 1 : 0);
      innerLabel.transition(t1).delay(1000).style("opacity", (d: any) => d.h > 50 ? 1 : 0);
    } else {
      outerLabel.transition(t1).delay(1000).style("opacity", (d: any) => d.w > 50 ? 1 : 0);
      innerLabel.transition(t1).delay(1000).style("opacity", (d: any) => d.w > 50 ? 1 : 0);
    }

    return this;
  }

  private _drawLinks(): Sankey {
    const svg = select(this.container).select("svg");
    const id: string = (svg.node() as SVGElement).id;
    const canvas = svg.select(".canvas");
    const fade = this.playback ? " shadow" : "";

    if (this.orient === "horizontal") {
      this._linkGenerator = linkHorizontal()
        .source((d: any) => [d.nodeIn.x + this.nodeSize, d.y0])
        .target((d: any) => [d.nodeOut.x, d.y1])
        .x((d: any) => d[0])
        .y((d: any) => d[1]);
    } else {
      this._linkGenerator = linkVertical()
        .source((d: any) => [d.y0, d.nodeIn.y + this.nodeSize])
        .target((d: any) => [d.y1, d.nodeOut.y])
        .x((d: any) => d[0])
        .y((d: any) => d[1]);
    }

    const linkCollection = canvas.append("g")
      .attr("class", "links")
      .selectAll("g")
      .data(this.links).enter()
      .append("g")
        .attr("id", d => `${id}_${d.id}`)
        .attr("class", "link" + fade)
        .on("click", (d: TLink) => this._linkClickHandler(event.target));

    selectAll("g.links").lower();

    const path = linkCollection
      .append("path")
        .attr("class", "link")
        .attr("stroke", (d: any) => d.fill ? d.fill : d.nodeIn.fill)
        .attr("stroke-width", (d: TLink) => d.w)
        .attr("fill", "none");

    linkCollection.append("title")
      .text((d: TLink) => `${d.nodeIn.name} -> ${d.nodeOut.name} - ${formatNumber(d.value)}`);

    const t: any = transition().duration(600);
    path.transition(t).delay(1000)
      // @ts-ignore
      .attr("d", d => this._linkGenerator(d));

    return this;
  }

  private _drawMisc(): Sankey {
    const container = select(this.container);
    const box = measure(this.container);
    const canvas = container.select(".canvas");

    if (this.playback) {
      const pb = canvas.append("g")
        .attr("class", "playback-prompt");

      const rect = container.append("div")
        .attr("class", "playback-prompt")
        .style("opacity", 1)
        .text("Select a node to start");

      const b: DOMRect = rect.node()?.getBoundingClientRect() as DOMRect;
      rect.style("top", (box.top + (this.rh / 2) - (b.height / 2))+ "px")
          .style("left", (box.left + (this.rw / 2) - (b.width / 2)) + "px");

      rect.transition().duration(3000)
        .style("opacity", 1)
        .transition().duration(5000)
        .style("opacity", 0)
        .transition().duration(0)
        .style("display", "none");

      canvas.selectAll("g.node")
        .each((d: any, i: number, n: any) => {
          const r = select(n[i]);

          const c = pb.append("circle")
            .attr("class", "playback-prompt")
            .attr("cx", d.x + (d.w / 2))
            .attr("cy", d.y + (d.h / 2))
            .attr("r", 0);

          c.lower();

          c.transition().duration(3000)
            .attr("r", 20)
            .transition().duration(5000)
            .attr("r", 0)
            .transition().delay(5500)
            .remove();
        });
    }

    return this;
  }

  private _drawNodes(): Sankey {
    const self = this;
    const svg = select(this.container).select("svg");
    const id: string = (svg.node() as SVGElement).id;
    const canvas = svg.select(".canvas");
    const fade = this.playback ? " shadow" : "";

    const nodes = canvas.append("g")
      .attr("class", "nodes")
      .selectAll("g.node")
      .data(this.nodes).enter()
      .append("g")
        .attr("id", (d: TNode) => `${id}_${d.id}`)
        .attr("class", (d: TNode) => "node" + (d.layer > 0 ? fade : ""))
        .attr("transform", (d: TNode) => {
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
        .on("click", () => this._nodeClickHandler(event.currentTarget));

    select("g.nodes").raise();

    const rect = nodes.append("rect")
      .attr("class", "node")
      .attr("height", (d: TNode) => d.h + "px")
      .attr("width", (d: TNode) => d.w + "px")
      .attr("fill", (d: TNode) => d.fill)
      .attr("x", 0)
      .attr("y", 0)
      .style("opacity", 0);

    nodes.append("rect")
      .attr("class", "shadow node")
      .attr("height", (d: TNode) => (this.playback ? d.h : 0) + "px")
      .attr("width", (d: TNode) => (this.playback ? d.w : 0) + "px")
      .attr("x", 0)
      .attr("y", 0);

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
          if (self.nodeMoveX) {
            d.x = d.__x0 + dx;
            if (d.x < 0) {
              d.x = 0;
            }
          }

          // y direction
          if (self.nodeMoveY) {
            d.y = d.__y0 + dy;
            if (d.y < 0) {
              d.y = 0;
            }
          }

          return `translate(${d.x}, ${d.y})`;
        });
  
      self._positionLinks();
      selectAll("path.link")
        .attr("d", d => self._linkGenerator(d));
    }

    function dragend(d: any) {
      delete d.__x;
      delete d.__y;
      delete d.__x0;
      delete d.__x1;
      delete d.__y0;
      delete d.__y1;
    }

    return this;
  }

  /**
   * Creates the initial data structures
   */
  private _initDataStructure(nodes: TNode[], links: TLink[]): void {
    nodes.forEach((node: TNode, i: number) => {
      const n = node;
      n.h = 0;          // height
      n.id = i + 1;
      n.layer = -1;     // denotes membership to a visual grouping
      n.linksIn = [];   // replaces source in other sankey models
      n.linksOut = [];  // ditto target
      n.w = 0;          // width
      n.x = 0;          // position onscreen
      n.y = 0;
      this.nodes.push(n);
    });

    links.forEach((link: TLink, i: number) => {
      const l = link;
      l.nodeIn = this.nodes[link.source];   // replaces source in other sankey models
      l.nodeOut = this.nodes[link.target];  // ditto target
      l.id = `${l.nodeIn.id}->${l.nodeOut.id}`;
      l.w = 0;    // width
      l.y0 = 0;   // value at source node (horizontal: top right y, vertical: bottom left x)
      l.y1 = 0;   // value at target node (horizontal: bottom left y, vertical; top right x)
      this.links.push(l);
      this.links[i].nodeIn.linksOut.push(this.links[i]);
      this.links[i].nodeOut.linksIn.push(this.links[i]);
    });
  }

  private _linkClickHandler(el: Element): void {
    event.stopPropagation();
    this.clearSelection();
    window.dispatchEvent(new CustomEvent("link-selected", { detail: el }));
    select(el).classed("selected", true);
  }

  private _nodeClickHandler(el: Element): void {
    event.stopPropagation();
    this.clearSelection();
    const activeNode = select(el);
    const dt = activeNode.datum() as TNode;
    if (this.playback && dt.linksOut.length > 0) {
      activeNode.classed("shadow", false);
      const nMap = new Map();
      nMap.set(el.id, dt.value);

      selectAll("g.link.shadow")
        .each((d: any, i: number, n: any) => {
          if (d.nodeIn === dt) {
            const link = select(n[i]);
            link.classed("shadow", false);
            let id = link.attr("id");
            id = id.replace(/_\d+\->/ , "_");
            let sum = d.value;
            if (nMap.has(id)) {
              sum += nMap.get(id);
            }
            nMap.set(id, sum);
          }
        });

      for (let [k,v] of nMap.entries()) {
        const node = select("#" + k);
        node.classed("shadow", false);
        const r = node.select(".node");
        const shadow = node.select(".node.shadow");
        if (this.orient === "horizontal") {
          let h = parseFloat(shadow.attr("height"));
          if (h > 0) {
            h = h - this._scale(v);
            h = h >= 0 ? h : 0;
            shadow.transition().duration(500)
              .attr("height", h + "px");
          }
        } else {
          let w = parseFloat(shadow.attr("width"));
          let x = parseFloat(dt === node.datum() ? r.attr("x") : shadow.attr("x"));
          if (w > 0) {
            w = w - this._scale(v);
            w = w >= 0 ? w : 0;
            shadow.transition().duration(500)
              .attr("width", w + "px")
              .attr("x", x + this._scale(v));
          }
        }
      }
    } else {
      window.dispatchEvent(new CustomEvent("node-selected", { detail: el }));
      selectAll("g.link")
        .each((d: any, i: number, n: any) => {
          if (d.nodeIn === dt || d.nodeOut === dt) {
            const link = select(n[i]);
            link.select("path").classed("selected", true);
          }
        });
    }
  }

  /**
   * Sets height and width of node
   */
  private _nodeSize(): Sankey {
    this.nodes.forEach((node: TNode) => {
      if (this.orient === "horizontal") {
        node.h = Math.max(1, this._scale(node.value));
        node.w = this.nodeSize;
      } else {
        node.h = this.nodeSize;
        node.w = Math.max(1, this._scale(node.value));
      }
    });
    return this;
  }

  /**
   * Determines each node dimension and layer attribution and finally determines node order within layer
   */
  private _nodeValueLayer(): Sankey {
    const track: Map<number, number[]> = new Map();
    let max = 0;
    this.nodes.forEach((node: TNode) => {
      // calculate value if not already provided
      if (node.value === undefined) {
        node.value = Math.max(
          1,
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

    this._layerGap = (this.orient === "horizontal" ? this.rw : this.rh) / this._totalLayers;

    // sort: by layer asc then by size then by a-z name
    this.nodes.sort((a, b) => a.layer - b.layer || b.value - a.value || (b.name > a.name ? -1 : 1));
    return this;
  }

  /**
   * Positions links relative to sourcec and destination nodes
   */
  private _positionLinks(): Sankey {
    // sort: by size then by a-z name
    this.links.sort((a, b) => b.value - a.value || (b.nodeIn.name > a.nodeIn.name ? -1 : 1));

    const source = new Map<number, number>();
    const target = new Map<number, number>();

    this.links.forEach((link: TLink) => {
      let src = 0, tgt = 0;
      link.w = Math.max(1, this._scale(link.value));
      if (!source.has(link.nodeIn.id)) {
        source.set(link.nodeIn.id, (this.orient === "horizontal") ? link.nodeIn.y : link.nodeIn.x);
      }
      if (!target.has(link.nodeOut.id)) {
        target.set(link.nodeOut.id, (this.orient === "horizontal") ? link.nodeOut.y : link.nodeOut.x);
      }
      src = source.get(link.nodeIn.id) as number;
      link.y0 = src + (link.w / 2);
      tgt = target.get(link.nodeOut.id) as number;
      link.y1 = tgt + (link.w / 2);
      source.set(link.nodeIn.id, link.y0 + (link.w / 2));
      target.set(link.nodeOut.id, link.y1 + (link.w / 2));
    });

    return this;
  }

  /**
   * spreads the nodes across the chart space by layer
   */
  private _positionNodeByLayer(): Sankey {
    if (this.orient === "horizontal") {
      this.nodes.forEach((node: TNode) => {
        node.x = node.layer * this._layerGap;
        if (node.x >= this.rw) {
          node.x -= this.nodeSize;
        } else if (node.x < 0) {
          node.x = 0;
        }
      });
    } else {
      this.nodes.forEach((node: TNode) => {
        node.y = node.layer * this._layerGap;
        if (node.y >= this.rh) {
          node.y -= this.nodeSize;
        } else if (node.y < 0) {
          node.y = 0;
        }
      });
    }
    return this;
  }

  /**
   * spreads the nodes within layer
   */
  private _positionNodeInLayer(): Sankey {
    let layer = -1, n = 0;
    let layerTracker: any[] = [];
    if (this.orient === "horizontal") {
      this.nodes.forEach((node: TNode) => {
        if (layer === node.layer) {
          node.y = n;
          n += node.h + this.padding;
          layerTracker[layer].sum = n;
          layerTracker[layer].nodes.push(node);
        } else {
          layer = node.layer;
          node.y = 0;
          n = node.h + this.padding;
          layerTracker.push({ nodes: [node], sum: n, total: this.rh });
        }
      });
    } else {
      this.nodes.forEach((node: TNode) => {
        if (layer === node.layer) {
          node.x = n;
          n += node.w + this.padding;
          layerTracker[layer].sum = n;
          layerTracker[layer].nodes.push(node);
        } else {
          layer = node.layer;
          node.x = 0;
          n = node.w + this.padding;
          layerTracker.push({ nodes: [node], sum: n, total: this.rw });
        }
      });
    }
    
    // 2nd pass to widen out layers too tightly clustered together
    layerTracker.forEach(layer => {
      if (layer.sum * 1.2 < layer.total && layer.nodes.length > 1) {
        const customPad = ((layer.total - layer.sum) * 0.75) / layer.nodes.length;
        layer.nodes.forEach((node: TNode, i: number) => {
          if (this.orient === "horizontal") {
            node.y += (i + 1) * customPad;
          } else {
            node.x += (i + 1) * customPad;
          }
        });
      }
    });

    return this;
  }

  /**
   * Calculates the chart scale
   */
  private _scaling(): Sankey {
    const rng: [number, number] = [0, this.orient === "horizontal" ? this.rh : this.rw];
    this._scale = scaleLinear().domain(this._extent).range(rng);
    return this;
  }

  /**
   * Determines the minimum and maximum extent values to scale nodes by
   */
  private _scalingExtent(): Sankey {
    this._extent[0] = this.nodes.reduce((ac: number, n: TNode) => (ac === undefined || n.value < ac) ? n.value : ac, 0);
    let max = this._extent[0], layer = 0, runningTotal = 0;
    this.nodes.forEach((node: TNode) => {
      if (node.layer === layer) {
        runningTotal += node.value;
      }
      else {
        layer = node.layer;
        max = runningTotal > max ? runningTotal : max;
        runningTotal = node.value;
      }
    });
    this._extent[1] = (runningTotal > max ? runningTotal : max) + (this.padding * (this.nodes.length * 2.5));
    return this;
  }
}