# sankey

My take on building a sankey.

## Installation

```shell
npm i --save @buckneri/sankey
```

## API

### Methods

#### clearSelection()

clears selection from chart elements

#### data(nodes *TNode[]*, links *TLink[]*)

saves data to chart

#### destroy()

self-destruct Sankey

#### draw()

draws Sankey to DOM

#### initialise()

calculates the internal values

#### toString()

serialises the internal data

### Properties

#### container *HTMLElement*

DOM element to draw Sankey to

#### h *number*

height of Sankey

#### linkGenerator *Function*

#### links *TLink[]*

data for links

#### margin *TMargin*

gap between chart and canvas

#### nodeMoveX *boolean*

determines if nodes can be moved left/right

#### nodeMoveY *boolean*

determines if nodes can be moved up/down

#### nodes *TNode[]*

data for nodes

#### nodeSize *number*

node size of non-data dimension

#### orient *TOrientation*

align nodes left-to-right, or top-to-bottom

#### padding *number*

padding between the nodes

#### rh *number*

relative height, height less margins

#### rw *number*

relative width, width less margins

#### w *number*

width of Sankey
