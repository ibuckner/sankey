# sankey

My take on building a Sankey chart. The build includes a starter CSS file, and two javascript versions for ES modules and current browsers. No serious attempt has been made towards ie11 compatibility.

## Installation

```shell
npm i --save @buckneri/sankey
```

## API

### Constructor

```javascript
const sankey = new Sankey({
  container: document.getElementById("chart"),
  links: data.links,
  margin: { bottom: 20, left: 20, right: 20, top: 20 },
  nodeMoveX: true,      // if true, nodes can be dragged
  nodeMoveY: true,
  nodes: data.nodes,
  nodeSize: 30,         // node dimension not set by data
  orient: "horizontal"  // or "vertical"
  padding: 5,           // gap between nodes
  playback: false       // standard sankey, or playback mode if true
});
```

### Methods

```javascript
sankey.clearSelection();
// clears selection from chart elements

sankey.data(nodes, links);
// stores and initialises data

sankey.destroy();
// self-destruct

sankey.draw();
// draws chart to DOM

sankey.initialise();
// (re)calculates the internal values

sankey.toString();
// serialises the internal data
```

### Properties

```javascript
sankey.container;
// parent element for chart

sankey.h;
// height of chart

sankey.links;
// data for links

sankey.margin;
// defines the border zone around the canvas

sankey.nodeMoveX;
// determines if nodes can be moved left/right

sankey.nodeMoveY;
// determines if nodes can be moved up/down

sankey.nodes;
// data for nodes

sankey.nodeSize;
// node size of non-data dimension

sankey.orient;
// align nodes left-to-right, or top-to-bottom

sankey.padding;
// padding between the nodes

sankey.playback;
// controls mode of chart display

sankey.rh;
// relative height, height - margins

sankey.rw;
// relative width, width - margins

sankey.w;
// width of chart
```
