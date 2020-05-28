let json = {
    nodes: [
      {name: "N1",fill: "#9E0142",label: "Start",story: "Organisation 1"}, 
      {name: "N2",fill: "#9E0142",label: "Start",story: "Organisation 2"}, 
      {name: "N3",fill: "#9E0142",label: "Start",story: "Organisation 3"}, 
      {name: "N4",fill: "#9E0142",label: "Start",story: "Organisation 4"}, 
      {name: "N5",fill: "#9E0142",label: "Start",story: "Organisation 5"}, 
      {name: "N6",fill: "#9E0142",label: "Start",story: "Organisation 6"}, 
      {name: "N7",fill: "#9E0142",label: "Start",story: "Organisation 7"}, 
      {name: "N8",fill: "#F46D43",label: "End",story: "Organisation 8"}, 
      {name: "N9",fill: "#F46D43",label: "End",story: "Organisation 9"}, 
      {name: "N10",fill: "#F46D43",label: "End",story: "Organisation 10"}, 
      {name: "N11",fill: "#F46D43",label: "End",story: "Organisation 11"}, 
      {name: "N12",fill: "#F46D43",label: "End",story: "Organisation 12"}, 
      {name: "N13",fill: "#F46D43",label: "End",story: "Organisation 13"}, 
      {name: "N14",fill: "#F46D43",label: "End",story: "Organisation 14"}, 
      {name: "N15",fill: "#FEE08B",label: "Intermediate",story: "Organisation 15"}, 
      {name: "N16",fill: "#FEE08B",label: "Intermediate",story: "Organisation 16"}, 
      {name: "N17",fill: "#FEE08B",label: "Intermediate",story: "Organisation 17"}, 
      {name: "N18",fill: "#FEE08B",label: "Intermediate",story: "Organisation 18"}, 
      {name: "N19",fill: "#FEE08B",label: "Intermediate",story: "Organisation 19"}
    ],
    links: [
      {source: 0,target: 8,value: 696,fill: "#FFFFB3",story: "Flow 1"}, 
      {source: 0,target: 9,value: 138,fill: "#80B1D3",story: "Flow 2"}, 
      {source: 0,target: 9,value: 3,fill: "#B3DE69",story: "Flow 3"}, 
      {source: 0,target: 9,value: 142,fill: "#FDB462",story: "Flow 4"}, 
      {source: 0,target: 9,value: 369,fill: "#FFFFB3",story: "Flow 5"}, 
      {source: 0,target: 10,value: 4,fill: "#80B1D3",story: "Flow 6"},
      {source: 0,target: 10,value: 1,fill: "#BEBADA",story: "Flow 7"}, 
      {source: 0,target: 10,value: 2,fill: "#FDB462",story: "Flow 8"}, 
      {source: 0,target: 10,value: 9,fill: "#FFFFB3",story: "Flow 9"}, 
      {source: 0,target: 11,value: 24,fill: "#80B1D3",story: "Flow 10"}, 
      {source: 0,target: 11,value: 25,fill: "#FDB462",story: "Flow 11"}, 
      {source: 0,target: 11,value: 60,fill: "#FFFFB3",story: "Flow 12"}, 
      {source: 0,target: 12,value: 22,fill: "#80B1D3",story: "Flow 13"}, 
      {source: 0,target: 12,value: 1,fill: "#B3DE69",story: "Flow 14"},
      {source: 0,target: 12,value: 97,fill: "#FDB462",story: "Flow 15"}, 
      {source: 0,target: 12,value: 34,fill: "#FFFFB3",story: "Flow 16"}, 
      {source: 0,target: 13,value: 32,fill: "#FFFFB3",story: "Flow 17"}, 
      {source: 0,target: 14,value: 1201,fill: "#8DD3C7",story: "Flow 18"}, 
      {source: 0,target: 14,value: 2,fill: "#B3DE69",story: "Flow 19"}, 
      {source: 0,target: 14,value: 3,fill: "#FCCDE5",story: "Flow 20"}, 
      {source: 0,target: 14,value: 11,fill: "#FFFFB3",story: "Flow 21"}, 
      {source: 0,target: 16,value: 14,fill: "#8DD3C7",story: "Flow 22"}, 
      {source: 0,target: 17,value: 25,fill: "#8DD3C7",story: "Flow 23"}, 
      {source: 0,target: 17,value: 1,fill: "#FDB462",story: "Flow 24"},
      {source: 1,target: 7,value: 15,fill: "#8DD3C7",story: "Flow 25"},
      {source: 1,target: 8,value: 3,fill: "#FB8072",story: "Flow 26"},
      {source: 1,target: 8,value: 5,fill: "#FFFFB3",story: "Flow 27"}, 
      {source: 1,target: 9,value: 1,fill: "#80B1D3",story: "Flow 28"},
      {source: 1,target: 9,value: 59,fill: "#FB8072",story: "Flow 29"},
      {source: 1,target: 9,value: 1,fill: "#FDB462",story: "Flow 30"}, 
      {source: 1,target: 9,value: 3,fill: "#FFFFB3",story: "Flow 31"}, 
      {source: 1,target: 10,value: 8,fill: "#FB8072",story: "Flow 32"},
      {source: 1,target: 11,value: 8,fill: "#FB8072",story: "Flow 33"},
      {source: 1,target: 11,value: 1,fill: "#FDB462",story: "Flow 34"},
      {source: 1,target: 12,value: 7,fill: "#FB8072",story: "Flow 35"},
      {source: 1,target: 12,value: 3,fill: "#FDB462",story: "Flow 36"},
      {source: 1,target: 12,value: 1,fill: "#FFFFB3",story: "Flow 37"},
      {source: 2,target: 10,value: 5,fill: "#FB8072",story: "Flow 38"}, 
      {source: 2,target: 12,value: 3,fill: "#FB8072",story: "Flow 39"}, 
      {source: 2,target: 15,value: 35,fill: "#FB8072",story: "Flow 40"}, 
      {source: 3,target: 9,value: 13,fill: "#FB8072",story: "Flow 41"}, 
      {source: 3,target: 10,value: 2,fill: "#FB8072",story: "Flow 42"}, 
      {source: 3,target: 11,value: 2,fill: "#FB8072",story: "Flow 43"}, 
      {source: 3,target: 12,value: 2,fill: "#FB8072",story: "Flow 44"}, 
      {source: 3,target: 14,value: 55,fill: "#FB8072",story: "Flow 45"},
      {source: 3,target: 16,value: 1,fill: "#FB8072",story: "Flow 46"},
      {source: 3,target: 17,value: 1,fill: "#FB8072",story: "Flow 47"},
      {source: 4,target: 15,value: 28,fill: "#FB8072",story: "Flow 48"}, 
      {source: 5,target: 12,value: 1,fill: "#FB8072",story: "Flow 49"}, 
      {source: 6,target: 15,value: 1,fill: "#D9D9D9",story: "Flow 50"},
      {source: 7,target: 14,value: 15,fill: "#8DD3C7",story: "Flow 51"},
      {source: 8,target: 14,value: 692,fill: "#8DD3C7",story: "Flow 52"},
      {source: 8,target: 16,value: 9,fill: "#8DD3C7",story: "Flow 53"},
      {source: 8,target: 17,value: 3,fill: "#8DD3C7",story: "Flow 54"},
      {source: 9,target: 14,value: 1,fill: "#8DD3C7",story: "Flow 55"},
      {source: 9,target: 15,value: 194,fill: "#80B1D3",story: "Flow 56"}, 
      {source: 9,target: 15,value: 3,fill: "#B3DE69",story: "Flow 57"}, 
      {source: 9,target: 15,value: 36,fill: "#BEBADA",story: "Flow 58"}, 
      {source: 9,target: 15,value: 57,fill: "#FB8072",story: "Flow 59"}, 
      {source: 9,target: 15,value: 164,fill: "#FDB462",story: "Flow 60"}, 
      {source: 9,target: 15,value: 308,fill: "#FFFFB3",story: "Flow 61"}, 
      {source: 10,target: 15,value: 7,fill: "#80B1D3",story: "Flow 62"}, 
      {source: 10,target: 15,value: 2,fill: "#BEBADA",story: "Flow 63"}, 
      {source: 10,target: 15,value: 13,fill: "#FB8072",story: "Flow 64"}, 
      {source: 10,target: 15,value: 3,fill: "#FDB462",story: "Flow 65"}, 
      {source: 10,target: 15,value: 6,fill: "#FFFFB3",story: "Flow 66"}, 
      {source: 11,target: 15,value: 31,fill: "#80B1D3",story: "Flow 67"},
      {source: 11,target: 15,value: 8,fill: "#FB8072",story: "Flow 68"},
      {source: 11,target: 15,value: 29,fill: "#FDB462",story: "Flow 69"},
      {source: 11,target: 15,value: 52,fill: "#FFFFB3",story: "Flow 70"},
      {source: 12,target: 15,value: 27,fill: "#80B1D3",story: "Flow 71"}, 
      {source: 12,target: 15,value: 1,fill: "#B3DE69",story: "Flow 72"}, 
      {source: 12,target: 15,value: 9,fill: "#FB8072",story: "Flow 73"}, 
      {source: 12,target: 15,value: 122,fill: "#FDB462",story: "Flow 74"}, 
      {source: 12,target: 15,value: 12,fill: "#FFFFB3",story: "Flow 75"}, 
      {source: 13,target: 14,value: 21,fill: "#8DD3C7",story: "Flow 76"}, 
      {source: 13,target: 15,value: 3,fill: "#8DD3C7",story: "Flow 77"}, 
      {source: 13,target: 15,value: 1,fill: "#D9D9D9",story: "Flow 78"}, 
      {source: 13,target: 15,value: 1,fill: "#FDB462",story: "Flow 79"},
      {source: 13,target: 18,value: 4,fill: "#8DD3C7",story: "Flow 80"}, 
      {source: 13,target: 18,value: 2,fill: "#FDB462",story: "Flow 81"}
    ]
  };

const App = function() {
  function start () {
    page();
    menu();
    move();
    orientation();
    padding();
    playback();

    const sankey = new chart.Sankey({
      container: document.getElementById("chart"),
      links: json.links,
      margin: { bottom: 10, left: 10, right: 10, top: 10 },
      nodeMoveX: document.getElementById("MoveX").checked,
      nodeMoveY: document.getElementById("MoveY").checked,
      nodes: json.nodes,
      nodeSize: 30,
      orient: document.getElementById("OrientLTR").checked ? "horizontal" : "vertical",
      padding: 5,
      playback: document.getElementById("Playback").checked,
      playbackDelay: "1s"
    });

    sankey.draw();

    window.addEventListener("sankey-reload", function(e) {
      if (e.detail.orient) {
        sankey.orient = e.detail.orient;
      }
      if (e.detail.padding !== undefined) {
        sankey.padding = e.detail.padding;
      }
      if (e.detail.playback !== undefined) {
        sankey.playback = e.detail.playback ? true : false;
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
    const label = document.getElementById("PaddingLabel");
    label.textContent = padding.value;
    padding.addEventListener("change", function(e) {
      const data = { padding: +e.target.value };
      label.textContent = data.padding;
      window.dispatchEvent(new CustomEvent("sankey-reload", { detail: data }));
    });
  }

  function playback() {
    const playback = document.getElementById("Playback");
    playback.addEventListener("change", function(e) {
      const data = { playback: +e.target.checked };
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
