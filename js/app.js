// set up SVG for D3
var width  = 640,
    height = 540,
    colors = d3.scale.category10();

var svg = d3.select('.graph')
  .append('svg')
  .attr('id', 'svgDoc')
  .attr('width', width)
  .attr('height', height);

var svgContainer = svg.append("g");

var currentTranslate = null;
var currentScale = null;

function zoom(){
    if(panzoom) {
      currentTranslate = zoom.translate();
      currentScale = zoom.scale();
      svgContainer.attr('transform', 'translate(' + zoom.translate() + ')' + ' scale(' +         zoom.scale() + ')');
    }
};

var formInput = false;

// set up initial nodes and links
//  - nodes are known by 'id', not by index in array.
//  - reflexive edges are indicated on the node (as a bold black circle).
//  - links are always source < target; edge directions are set by 'left' and 'right'.
var nodes = [
    {id: 0, label: "CCSS Math", reflexive: false},
    {id: 1, label: "Algebra", reflexive: false },
    {id: 2, label: "PreAlgebra", reflexive: false},
    {id: 3, label: "Geometry", reflexive: false },
    {id: 4, label: "Counting and Cardinality", reflexive: false }
  ],
  lastNodeId = 4,
  links = [
    {source: nodes[0], target: nodes[1], left: false, right: true },
    {source: nodes[1], target: nodes[2], left: false, right: true },
    {source: nodes[0], target: nodes[3], left: false, right: true },
    {source: nodes[0], target: nodes[4], left: false, right: true }
  ];

// init D3 force layout
var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([width, height])
    .linkDistance(150)
    .charge(-500)
    .on('tick', tick)

// define arrow markers for graph links
svgContainer.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

svgContainer.append('svg:defs').append('svg:marker')
    .attr('id', 'start-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 4)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M10,-5L0,0L10,5')
    .attr('fill', '#000');

var drag = force.drag()
    .on("dragstart", dragstart);

function dragstart(d) {
  //console.log(d);
  d.fixed = true;
  d3.select(this).classed("fixed", true);
}
// line displayed when dragging new nodes
var drag_line = svgContainer.append('svg:path')
  .attr('class', 'link dragline hidden')
  .attr('d', 'M0,0L0,0');

// handles to link and node element groups
var path = svgContainer.append('svg:g').selectAll('path'),
    circle = svgContainer.append('svg:g').selectAll('g');


// mouse event vars
var selected_node = null,
    selected_link = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null;

function resetMouseVars() {
  mousedown_node = null;
  mouseup_node = null;
  mousedown_link = null;
}

// update force layout (called automatically each iteration)
function tick() {
  // draw directed edges with proper padding from node centers
  path.attr('d', function(d) {
    var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = d.left ? 17 : 12,
        targetPadding = d.right ? 17 : 12,
        sourceX = d.source.x + (sourcePadding * normX),
        sourceY = d.source.y + (sourcePadding * normY),
        targetX = d.target.x - (targetPadding * normX),
        targetY = d.target.y - (targetPadding * normY);
    return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
  });

  circle.attr('transform', function(d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });
}


// update graph (called when needed)
function restart() {
  // path (link) group
  path = path.data(links);

  // update existing links
  path.classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });


  // add new links
  path.enter().append('svg:path')
    .attr('class', 'link')
    .classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
    .on('mousedown', function(d) {
      if(d3.event.altKey) return;

      // select link
      mousedown_link = d;
      if(mousedown_link === selected_link) selected_link = null;
      else selected_link = mousedown_link;
      selected_node = null;
      restart();
    });

  // remove old links
  path.exit().remove();


  // circle (node) group
  // NB: the function arg is crucial here! nodes are known by id, not by index!
  circle = circle.data(nodes, function(d) { return d.id; });

  // update existing nodes (reflexive & selected visual states)
  circle.selectAll('circle')
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .classed('reflexive', function(d) { return d.reflexive; });

  // add new nodes
  var g = circle.enter().append('svg:g');

    //.attr("transform", function(d) { return "translate(" + d + ")"; })
  g.append('svg:circle')
    .attr('class', 'node')
    .attr('r', 12)
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .style('stroke', function(d) { return d3.rgb(colors(d.id)).darker().toString(); })
    .classed('reflexive', function(d) { return d.reflexive; })
    .on('mouseover', function(d) {
      if(!mousedown_node || d === mousedown_node) return;
      // enlarge target node
      //d3.select(this).attr('transform', 'scale(1.1)');
    })
    .on('mouseout', function(d) {
      if(!mousedown_node || d === mousedown_node) return;
      // unenlarge target node
      //d3.select(this).attr('transform', '');
    })
    .on('mousedown', function(d) {
      if(d3.event.altKey) return;

      // select node
      mousedown_node = d;
      if(mousedown_node === selected_node) selected_node = null;
      else selected_node = mousedown_node;
      selected_link = null;

      // reposition drag line
      drag_line
        .style('marker-end', 'url(#end-arrow)')
        .classed('hidden', false)
        .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

      restart();
    })
    .on('mouseup', function(d) {
      if(!mousedown_node) return;
      
      $('#standardId').val(mousedown_node.id);
      $('#standardLabel').val(mousedown_node.label);

      // needed by FF
      drag_line
        .classed('hidden', true)
        .style('marker-end', '');

      // check for drag-to-self
      mouseup_node = d;
      if(mouseup_node === mousedown_node) { resetMouseVars(); return; }

      // unenlarge target node
      //d3.select(this).attr('transform', '');

      // add link to graph (update if exists)
      // NB: links are strictly source < target; arrows separately specified by booleans
      var source, target, direction;
      if(mousedown_node.id < mouseup_node.id) {
        source = mousedown_node;
        target = mouseup_node;
        direction = 'right';
      } else {
        source = mouseup_node;
        target = mousedown_node;
        direction = 'left';
      }

      var link;
      link = links.filter(function(l) {
        return (l.source === source && l.target === target);
      })[0];

      if(link) {
        link[direction] = true;
      } else {
        link = {source: source, target: target, left: false, right: false};
        link[direction] = true;
        links.push(link);
      }

      // select new link
      selected_link = link;
      selected_node = null;
      restart();
    });

  // show node IDs
  g.append('svg:text')
      .attr('x', 0)
      .attr('y', 4)
      .attr('class', 'id')
      .text(function(d) { return d.id; });
	  
  // show node labels
  g.append('svg:text')
	      .attr('x', 0)
	      .attr('y', 20)
	      .attr('class', 'id')
	      .text(function(d) {  this.id = 'clabel' + d.id; return ""; }).append('svg:tspan').text(function(d) { return d.label; });	  

  // remove old nodes
  circle.exit().remove();

  // set the graph in motion
  force.start();
}

function mousedown() {

  // prevent I-bar on drag
  //d3.event.preventDefault();
  
  // because :active only works in WebKit?
  svg.classed('active', true);

  //TODO Steve 
  //svgConatiner.call(d3.behavior.zoom().on("zoom"), null);

  if(d3.event.altKey || mousedown_node || mousedown_link) return;

  // insert new node at point
  var newx = d3.mouse(this)[0];
  var newy = d3.mouse(this)[1];

  if(currentScale !== null) {
    newx = (newx - currentTranslate[0]) / currentScale;
    newy = (newy - currentTranslate[1]) / currentScale;
  }

  console.log("mx: " + d3.mouse(this)[0]);
  console.log("my: " + d3.mouse(this)[1]);
  console.log("nx: " + newx);
  console.log("ny: " + newy);

  if(d3.event.shiftKey) {
    var point = d3.mouse(this),
      node = {id: ++lastNodeId, label: "new", reflexive: false, fixed: true};
      node.x = newx;
      node.y = newy;
    nodes.push(node);
  }
  restart();
}

function mousemove() {
  if(!mousedown_node) return;

  var newx = d3.mouse(this)[0];
  var newy = d3.mouse(this)[1];

  if(currentScale !== null) {
    newx = (newx - currentTranslate[0]) / currentScale;
    newy = (newy - currentTranslate[1]) / currentScale;
  }

  // update drag line
  if(panzoom === false) {
    drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + newx + ',' + newy );
  }

  restart();
}

function mouseup() {
  if(mousedown_node) {
    // hide drag line
    drag_line
      .classed('hidden', true)
      .style('marker-end', '');
  }

  // because :active only works in WebKit?
  svg.classed('active', false);

  // enable zoom
  //svgContainer.call(d3.behavior.zoom().on("zoom"), zoom);

  // clear mouse event vars
  resetMouseVars();
}

function spliceLinksForNode(node) {
  var toSplice = links.filter(function(l) {
    return (l.source === node || l.target === node);
  });
  toSplice.map(function(l) {
    links.splice(links.indexOf(l), 1);
  });
}

// only respond once per keydown
var lastKeyDown = -1;

function keydown() {

  if(formInput) {
    return;
  }
  d3.event.preventDefault();

  if(lastKeyDown !== -1) return;
  lastKeyDown = d3.event.keyCode;

  // alt
  if(d3.event.keyCode === 18) {
    circle.call(force.drag);
    svg.classed('alt', true);
  }

  if(!selected_node && !selected_link) return;
  switch(d3.event.keyCode) {
    case 8: // backspace
    case 46: // delete
      if(selected_node) {
        nodes.splice(nodes.indexOf(selected_node), 1);
        spliceLinksForNode(selected_node);
      } else if(selected_link) {
        links.splice(links.indexOf(selected_link), 1);
      }
      selected_link = null;
      selected_node = null;
      restart();
      break;
    case 66: // B
      if(selected_link) {
        // set link direction to both left and right
        selected_link.left = true;
        selected_link.right = true;
      }
      restart();
      break;
    case 76: // L
      if(selected_link) {
        // set link direction to left only
        selected_link.left = true;
        selected_link.right = false;
      }
      restart();
      break;
    case 82: // R
      if(selected_node) {
        // toggle node reflexivity
        selected_node.reflexive = !selected_node.reflexive;
      } else if(selected_link) {
        // set link direction to right only
        selected_link.left = false;
        selected_link.right = true;
      }
      restart();
      break;
  }
}

function keyup() {
  lastKeyDown = -1;

  // alt
  if(d3.event.keyCode === 18) {
    circle
      .on('mousedown.drag', null)
      .on('touchstart.drag', null);
    svg.classed('alt', false);
  }
}

var panzoom = false;

//jquery setup
$(document).ready(function() {

$("#standardLabel").blur(function() {
  formInput = false;
});

$( "#standardLabel" ).focus(function() {
  formInput = true;
});

$( "#standardUpdate" ).click(function(event) {
  event.preventDefault();  
  var id = $("#standardId").val();
  var node = nodes[id];
  if(node) {
    node.label = $("#standardLabel").val();
    d3.select("#clabel" +id + " tspan").text(node.label);
  }
  restart();
});

$( "#show-button" ).click(function(event) {
  alert(JSON.stringify(nodes));
  alert(JSON.stringify(links));
});

$( "#pan-zoom" ).click(function(event) {
  if(panzoom) {
    panzoom = false;
  } else {
    panzoom = true;
  } 
});

});

// app starts here
svg.on('mousedown', mousedown)
  .on('mousemove', mousemove)
  .on('mouseup', mouseup);

svg.call(zoom = d3.behavior.zoom().on('zoom', zoom)).on('dblclick.zoom', null);

d3.select(window)
  .on('keydown', keydown)
  .on('keyup', keyup);
restart();

