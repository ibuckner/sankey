let json = {
  nodes: [
    {name: "IVR",fill: "#D94801"}, {name: "111 Call Handler",fill: "#FD8D3C"}, {name: "CMC",fill: "#FD8D3C"}, 
    {name: "Worsening Condition",fill: "#FD8D3C"}, {name: "InHealth COVID Call Response",fill: "#F16913"}, 
    {name: "SMILE",fill: "#F16913"}, {name: "Dental",fill: "#FD8D3C"}, {name: "LAS Covid Response DST",fill: "#FD8D3C"}, 
    {name: "Starline",fill: "#FD8D3C"}, {name: "Admin Caller",fill: "#FD8D3C"}, {name: "Pathways DoS Referral",fill: "#FDD0A2"}, 
    {name: "999",fill: "#FDD0A2"}, {name: "Abandoned Calls",fill: "#FD8D3C"}, {name: "Covid-19 Hot Hub",fill: "#FDAE6B"}, 
    {name: "Covid Cat. 3 Self-care",fill: "#FDAE6B"}, {name: "GP",fill: "#FDAE6B"}
  ],
  "links": [
    {source: 0,target: 2,value: 2000,fill: "#B3DE69"}, {source: 0,target: 5,value: 1000,fill: "#B3DE69"},
    {source: 0,target: 1,value: 5000,fill: "#B3DE69"}, {source: 0,target: 3,value: 2000,fill: "#B3DE69"}, 
    {source: 1,target: 10,value: 3000,fill: "#BEBADA"}, {source: 0,target: 4,value: 12000,fill: "#B3DE69"},
    {source: 2,target: 10,value: 1000,fill: "#FCC5C0"}, {source: 2,target: 11,value: 1000,fill: "#FCC5C0"},
    {source: 3,target: 10,value: 1000,fill: "#FCC5C0"}, {source: 3,target: 11,value: 1000,fill: "#FCC5C0"},
    {source: 0,target: 12,value: 2000,fill: "#B3DE69"}, {source: 0,target: 8,value: 1000,fill: "#B3DE69"},
    {source: 0,target: 9,value: 1000,fill: "#B3DE69"}, {source: 0,target: 6,value: 1000,fill: "#B3DE69"},
    {source: 4,target: 7,value: 5000,fill: "#BEBADA"}, {source: 4,target: 13,value: 1000,fill: "#BEBADA"},
    {source: 4,target: 1,value: 4000,fill: "#BEBADA"}, {source: 4,target: 10,value: 1000,fill: "#BEBADA"},
    {source: 4,target: 11,value: 1000,fill: "#BEBADA"}, {source: 5,target: 10,value: 1000,fill: "#B3DE69"},
    {source: 6,target: 10,value: 500,fill: "#BEBADA"}, {source: 6,target: 5,value: 500,fill: "#BEBADA"},
    {source: 7,target: 11,value: 1000,fill: "#BEBADA"}, {source: 7,target: 14,value: 1000,fill: "#BEBADA"},
    {source: 7,target: 10,value: 1000,fill: "#8DD3C7"}, {source: 7,target: 10,value: 1000,fill: "#FCC5C0"},
    {source: 7,target: 15,value: 1000,fill: "#BEBADA"}, {source: 8,target: 10,value: 1000,fill: "#BEBADA"},
    {source: 9,target: 10,value: 1000,fill: "#BEBADA"}
  ]
};

const App = function() {
  function start () {
    page();
    menu();
    orientation();
    padding();

    const sankey = new chart.Sankey({
      container: document.getElementById("chart"),
      links: json.links,
      margin: { bottom: 20, left: 20, right: 30, top: 20 },
      nodes: json.nodes,
      orient: "vertical",
      padding: 5,
      size: 30
    });

    sankey.draw();

    window.addEventListener("sankey", function(e) {
      if (e.detail.orient) {
        sankey.orient = e.detail.orient;
      }
      if (e.detail.padding !== undefined) {
        sankey.padding = e.detail.padding;
      }
      sankey.redraw();
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

  function orientation() {
    const ltr = document.getElementById("OrientLTR");
    const ttb = document.getElementById("OrientTTB");
    
    ltr.addEventListener("click", handleClick);
    ttb.addEventListener("click", handleClick);
  
    function handleClick() {
      const data = { orient: ltr.checked ? "horizontal" : "vertical" };
      window.dispatchEvent(new CustomEvent("sankey", { detail: data }));
    }
  }

  function padding() {
    const padding = document.getElementById("Padding");
    padding.addEventListener("change", function(e) {
      const data = { padding: +e.target.value };
      window.dispatchEvent(new CustomEvent("sankey", { detail: data }));
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
