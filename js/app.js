// ACT ABG Editor app
// Steve Polyak, November 2013
// Based on several D3 examples, including Force graph editor and panzoom examples

var colors = d3.scale.category20(),
    width = 640,
    height = 540;

var svg = d3.select('.graph')
    .append('svg')
    .attr('id', 'svgDoc')
    .attr('width', width)
    .attr('height', height);

var svgContainer = svg.append("g");
var svgContainerChild = svgContainer.append ("g");

var currentTranslate = [0,0];
var currentScale = 1.0;
var nodeDragging = false;
var pathDrawing = false;

function zoomFn(){
    if(nodeDragging === false && pathDrawing === false) {
	var newx = d3.mouse(this)[0];
	var newy = d3.mouse(this)[1];
	if(currentScale !== null) {
	    newx = (newx - currentTranslate[0]) / currentScale;
	    newy = (newy - currentTranslate[1]) / currentScale;
	}
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

//    {id: 0, label: "sample", reflexive: false, fixed: true, x:100, y:100, info: ""}
//    {source: nodes[0], target: nodes[1], left: false, right: true },
var nodes = [
    {id: 0, label: "new", reflexive: false, fixed: true, x:100, y:100, info: "new"}
],
lastNodeId = 0,
links = [];

// init D3 force layout
var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([width, height])
    .linkDistance(150)
    .charge(-500)
    .on('tick', tick)

// define arrow markers for graph links
svgContainerChild.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

svgContainerChild.append('svg:defs').append('svg:marker')
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
    d.fixed = true;
    d3.select(this).classed("fixed", true);
}
// line displayed when dragging new nodes
var drag_line = svgContainerChild.append('svg:path')
    .attr('class', 'link dragline hidden')
    .attr('d', 'M0,0L0,0');

// handles to link and node element groups
var path = svgContainerChild.append('svg:g').selectAll('path'),
circle = svgContainerChild.append('svg:g').selectAll('g');

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
	.style('fill', function(d) { if(d.textonly) return "#d3d3d3"; return (d === selected_node) ? d3.rgb(colors(0)).brighter().toString() : colors(0); })
	.classed('textonly', function(d) { return d.textonly; })
	.classed('reflexive', function(d) { return d.reflexive; });

    // add new nodes
    var g = circle.enter().append('svg:g');

    g.append('svg:circle')
	.attr('class', 'node')
	.attr('r', function(d) { return 12; })
	.style('fill', function(d) { if(d.textonly) return "#d3d3d3"; return (d === selected_node) ? d3.rgb(colors(0)).brighter().toString() : colors(0); })
	.style('stroke', function(d) { return d3.rgb(colors(0)).darker().toString(); })
	.classed('reflexive', function(d) { return d.reflexive; })
	.classed('textonly', function(d) { return d.textonly; })
	.on('mouseover', function(d) {
	    if(!mousedown_node || d === mousedown_node) return;
	})
	.on('mouseout', function(d) {
	    if(!mousedown_node || d === mousedown_node) return;
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
	    $('#standardDescription').val(mousedown_node.info);

	    // needed by FF
	    drag_line
		.classed('hidden', true)
		.style('marker-end', '');

	    // check for drag-to-self
	    mouseup_node = d;
	    if(mouseup_node === mousedown_node) { resetMouseVars(); return; }

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
	.text(function(d) { if(d.textonly) return null; return d.id; });
    
    // show node labels
    //first a copy with thick white stroke for legibility
    g.append('svg:text')
	.attr('x', 0)
	.attr('y', 20)
	.attr('class', 'id shadow')
	.text(function(d) {  this.id = 'hclabel' + d.id; return ""; }).append('svg:tspan').text(function(d) { return d.label; }); 

    g.append('svg:text')
	.attr('x', 0)
	.attr('y', 20)
	.attr('class', 'id')
	.text(function(d) {  this.id = 'clabel' + d.id; return ""; }).append('svg:tspan').text(function(d) { return d.label; }); 

    g.append("svg:rect")
	.attr('x', -75)
	.attr('y', 25)
	.attr('rx', 25)
	.attr('ry', 25)
        .attr("width", function(d) { if(d.textonly) return 0; return 150;})
        .attr("height", function(d) { if(d.textonly) return 0; return 100; })
        .attr("style", "fill:lightgray;stroke:black;stroke-width:5;opacity:0.5");

    var fo = g.append("svg:foreignObject")
	.attr('x', -60)
	.attr('y', 30)
        .attr("width", function(d) { if(d.textonly) return 0; return 120;})
        .attr("height", function(d) { if(d.textonly) return 0; return 100;})
    fo.append("xhtml:body")
      .attr("style","background:lightgray")
      .attr("id", function(d) {return 'cdescription' + d.id; })
      .html(function(d) {return d.info})
      .style("font", "10px Arial");

    // remove old nodes
    circle.exit().remove();

    // set the graph in motion
    force.start();
}

function mousedown() {
    // because :active only works in WebKit?
    svg.classed('active', true);

    if(d3.event.altKey || mousedown_node || mousedown_link) {
	return;
    }

    // insert new node at point
    var newx = d3.mouse(this)[0];
    var newy = d3.mouse(this)[1];
    if(currentScale !== null) {
	newx = (newx - currentTranslate[0]) / currentScale;
	newy = (newy - currentTranslate[1]) / currentScale;
    }

    if(d3.event.shiftKey) {
	var point = d3.mouse(this),
	node = {id: ++lastNodeId, label: "new", reflexive: false, fixed: true, info: "new"};
	node.x = newx;
	node.y = newy;
	nodes.push(node);
    }
    restart();
}

function mousemove() {
    if(!mousedown_node) {
	return;
    }
    nodeDragging = true;
    var newx = d3.mouse(this)[0];
    var newy = d3.mouse(this)[1];

    if(currentScale !== null) {
	newx = (newx - currentTranslate[0]) / currentScale;
	newy = (newy - currentTranslate[1]) / currentScale;
    }

    // update drag line
    drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + newx + ',' + newy );

    restart();
}

function mouseup() {
    if(mousedown_node) {
	// hide drag line
	drag_line
	    .classed('hidden', true)
	    .style('marker-end', '');
	nodeDragging = false;
    }

    if(currentTranslate !== null) {
      svg.call(zoom = d3.behavior.zoom().translate(currentTranslate).scale(currentScale).on("zoom", zoomFn));
    }

    // because :active only works in WebKit?
    svg.classed('active', false);

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
	nodeDragging = true;
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
	nodeDragging = false;
	circle
	    .on('mousedown.drag', null)
	    .on('touchstart.drag', null);
	svg.classed('alt', false);
    }
}

//jquery setup
$(document).ready(function() {

    $("#standardLabel").blur(function() {
	formInput = false;
    });

    $( "#standardLabel" ).focus(function() {
	formInput = true;
    });

    $("#standardDescription").blur(function() {
	formInput = false;
    });

    $( "#standardDescription" ).focus(function() {
	formInput = true;
    });

    $( "#standardUpdate" ).click(function(event) {
	event.preventDefault();  
	var id = $("#standardId").val();
	var node = nodes[id];
	if(node) {
	    node.label = $("#standardLabel").val();
	    node.info = $("#standardDescription").val();
	    d3.select("#hclabel" +id + " tspan").text(node.label);
	    d3.select("#clabel" +id + " tspan").text(node.label);
	    d3.select("#cdescription" +id).html(node.info);
	}
	restart();
    });

    $( "#show-button" ).click(function(event) {
	alert(JSON.stringify(nodes));
	alert(JSON.stringify(links));
    });

});

// app starts here
svg.on('mousedown', mousedown)
    .on('mousemove', mousemove)
    .on('mouseup', mouseup);

svg.call(zoom = d3.behavior.zoom().scaleExtent([-10, 10]).on('zoom', zoomFn)).on('dblclick.zoom', null);

d3.select(window)
    .on('keydown', keydown)
    .on('keyup', keyup);
restart();

