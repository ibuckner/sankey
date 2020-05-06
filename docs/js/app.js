let json = {
  nodes: [
    {name: "N9",fill: "#D94801"}, {name: "N1",fill: "#FD8D3C"}, {name: "N2",fill: "#FD8D3C"}, 
    {name: "N3",fill: "#FD8D3C"}, {name: "N4",fill: "#F16913"}, {name: "N5",fill: "#F16913"}, 
    {name: "N6",fill: "#FD8D3C"}, {name: "N7",fill: "#FD8D3C"}, {name: "N8",fill: "#FD8D3C"}, 
    {name: "N9",fill: "#FD8D3C"}, {name: "N10",fill: "#FDD0A2"}, {name: "N11",fill: "#FDD0A2"}, 
    {name: "N12",fill: "#FD8D3C"}, {name: "N13",fill: "#FDAE6B"}, {name: "N14",fill: "#FDAE6B"}, 
    {name: "N15",fill: "#FDAE6B"}, {name: "N16",fill: "#33AE6B"}, {name: "N17",fill: "#C5AE33"},
    {name: "N17",fill: "#C55192"}, {name: "N18",fill: "#125192"}, {name: "N19",fill: "#5251AA"},
    {name: "N20",fill: "#45CAFF"}, {name: "N21",fill: "#4599FF"}
  ],
  "links": [
    {source: 0,target: 2,value: 2000,fill: "#B3DE69"}, {source: 0,target: 16,value: 15000,fill: "#B3DE69"},
    {source: 0,target: 17,value: 10000,fill: "#B3DE69"}, {source: 0,target: 18,value: 11000,fill: "#B3DE69"},
    {source: 0,target: 19,value: 8000,fill: "#B3DE69"}, {source: 0,target: 20,value: 7000,fill: "#B3DE69"},
    {source: 6,target: 21,value: 22000,fill: "#B3DE69"}, {source: 4,target: 22,value: 18000,fill: "#B3DE69"},
    {source: 0,target: 5,value: 1000,fill: "#B3DE69"}, {source: 0,target: 2,value: 2000,fill: "#B3DE69"},
    {source: 0,target: 1,value: 5000,fill: "#B3DE69"}, {source: 0,target: 3,value: 2000,fill: "#B3DE69"}, 
    {source: 1,target: 10,value: 3000,fill: "#BEBADA"}, {source: 0,target: 4,value: 12000,fill: "#B3DE69"},
    {source: 2,target: 10,value: 1000,fill: "#FCC5C0"}, {source: 2,target: 11,value: 1000,fill: "#FCC5C0"},
    {source: 3,target: 10,value: 1000,fill: "#FCC5C0"}, {source: 3,target: 11,value: 1000,fill: "#FCC5C0"},
    {source: 0,target: 12,value: 2, fill: "#B3DE69"}, {source: 0,target: 8,value: 1000,fill: "#B3DE69"},
    {source: 0,target: 9,value: 1000,fill: "#B3DE69"}, {source: 0,target: 6,value: 1000,fill: "#B3DE69"},
    {source: 4,target: 7,value: 5000,fill: "#BEBADA"}, {source: 4,target: 13,value: 1000,fill: "#BEBADA"},
    {source: 4,target: 1,value: 4000,fill: "#BEBADA"}, {source: 4,target: 10,value: 1000,fill: "#BEBADA"},
    {source: 4,target: 11,value: 1000,fill: "#BEBADA"}, {source: 5,target: 10,value: 1000,fill: "#B3DE69"},
    {source: 6,target: 10,value: 500,fill: "#BEBADA"}, {source: 6,target: 5,value: 22,fill: "#BEBADA"},
    {source: 7,target: 11,value: 1000,fill: "#BEBADA"}, {source: 7,target: 14,value: 1000,fill: "#BEBADA"},
    {source: 7,target: 10,value: 1000,fill: "#8DD3C7"}, {source: 7,target: 10,value: 1000,fill: "#FCC5C0"},
    {source: 7,target: 15,value: 1000,fill: "#BEBADA"}, {source: 8,target: 10,value: 84,fill: "#BEBADA"},
    {source: 9,target: 10,value: 22,fill: "#BEBADA"}
  ]
};

const App = function() {
  function start () {
    page();
    menu();
    move();
    orientation();
    padding();

    const sankey = new chart.Sankey({
      container: document.getElementById("chart"),
      links: json.links,
      margin: { bottom: 20, left: 20, right: 30, top: 20 },
      nodeMoveX: document.getElementById("MoveX").checked,
      nodeMoveY: document.getElementById("MoveY").checked,
      nodes: json.nodes,
      nodeSize: 30,
      orient: document.getElementById("OrientLTR").checked ? "horizontal" : "vertical",
      padding: 5
    });

    sankey.draw();

    window.addEventListener("sankey-reload", function(e) {
      if (e.detail.orient) {
        sankey.orient = e.detail.orient;
      }
      if (e.detail.padding !== undefined) {
        sankey.padding = e.detail.padding;
      }
      sankey.destroy().initialise().draw();
    });

    window.addEventListener("sankey-update", function(e) {
      if (e.detail.nodeMoveX !== undefined) {
        sankey.nodeMoveX = e.detail.nodeMoveX;
      }
      if (e.detail.nodeMoveY !== undefined) {
        sankey.nodeMoveY = e.detail.nodeMoveY;
      }
    });
  }

  function menu () {
    const menu = document.querySelector(".menu");
    const menuButton = document.querySelector(".menu-button");

    if (menu && menuButton) {
      menuButton.addEventListener("click", function(e) {
        e.stopImmediatePropagation();
        menu.classList.toggle("ready");
      });
      menu.addEventListener("click", function(e) { e.stopImmediatePropagation(); });
    }
    window.addEventListener("hide-menu", function() { menu.classList.add("ready"); });
  }

  function move() {
    const x = document.getElementById("MoveX");
    const y = document.getElementById("MoveY");
    
    x.addEventListener("click", handleClick);
    y.addEventListener("click", handleClick);
  
    function handleClick() {
      const data = { nodeMoveX: x.checked, nodeMoveY: y.checked };
      window.dispatchEvent(new CustomEvent("sankey-update", { detail: data }));
    }
  }

  function orientation() {
    const ltr = document.getElementById("OrientLTR");
    const ttb = document.getElementById("OrientTTB");
    
    ltr.addEventListener("click", handleClick);
    ttb.addEventListener("click", handleClick);
  
    function handleClick() {
      const data = { orient: ltr.checked ? "horizontal" : "vertical" };
      window.dispatchEvent(new CustomEvent("sankey-reload", { detail: data }));
    }
  }

  function padding() {
    const padding = document.getElementById("Padding");
    padding.addEventListener("change", function(e) {
      const data = { padding: +e.target.value };
      window.dispatchEvent(new CustomEvent("sankey-reload", { detail: data }));
    });
  }

  function page() {
    const chart = document.getElementById("chart");
    chart.addEventListener("click", function() {
      window.dispatchEvent(new CustomEvent("hide-menu"));
    });
  }

  App.start = start;

  return App;
};
