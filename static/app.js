Vue.config.devtools = true
Vue.component('dependency-graph', {
  template:
  `<div :style="{ width: width + 'px', height: height + 'px', border: '1px solid black' }">
    <svg width="100%" height="100%">
      <defs>
        <pattern id="innerGrid" :width="innerGridSize" :height="innerGridSize" patternUnits="userSpaceOnUse">
          <rect width="100%" height="100%" fill="none" stroke="#CCCCCC7A" stroke-width="0.5"/>
        </pattern>
        <pattern id="grid" :width="gridSize" :height="gridSize" patternUnits="userSpaceOnUse">
          <rect width="100%" height="100%" fill="url(#innerGrid)" stroke="#CCCCCC7A" stroke-width="1.5"/>
        </pattern>
      </defs>
    </svg>
  </div>`,
  props: ['data'],
  data() {
    return {
      width: 1024,
      height: 768,
      gridSize: 100,
      selections: {},
      simulation: null,
      forceProperties: {
        center: {
          x: 0.5,
          y: 0.5
        },
        charge: {
          enabled: true,
          strength: -700,
          distanceMin: 1,
          distanceMax: 2000
        },
        collide: {
          enabled: true,
          strength: .7,
          iterations: 1,
          radius: 35
        },
        forceX: {
          enabled: true,
          strength: 0.05,
          x: 0.5
        },
        forceY: {
          enabled: true,
          strength: 0.35,
          y: 0.5
        },
        link: {
          enabled: true,
          distance: 100,
          iterations: 1
        }
      },
    }
  },
  computed: {
    innerGridSize() { return this.gridSize / 10 },
    nodes() { return this.data.nodes },
    links() { return this.data.links },
    // These are needed for captions
    linkTypes() {
      const linkTypes = []
      this.links.forEach(link => {
        if (linkTypes.indexOf(link.type) === -1)
          linkTypes.push(link.type)
      })
      return linkTypes.sort()
    },
    classes() {
      const classes = []
      this.nodes.forEach(node => {
        if (classes.indexOf(node.class) === -1)
          classes.push(node.class)
      })
      return classes.sort()
    },
  },
  created() {
    // You can set the component width and height in any way
    // you prefer. It's responsive! :)
    this.width = window.innerWidth - 10
    this.height = window.innerHeight - 110

    this.simulation = d3.forceSimulation()
      .force("link", d3.forceLink())
      .force("charge", d3.forceManyBody())
      .force("collide", d3.forceCollide())
      .force("center", d3.forceCenter())
      .force("forceX", d3.forceX())
      .force("forceY", d3.forceY())
      .on("tick", this.tick)
    // Call first time to setup default values
    this.updateForces()
  },
  mounted() {
    this.selections.svg = d3.select(this.$el.querySelector("svg"))
    const svg = this.selections.svg

    // Define the arrow marker
    svg.append("svg:defs").selectAll("marker")
          .data(["end"])      // Different link/path types can be defined here
        .enter().append("svg:marker")    // This section adds in the arrows
          .attr("id", String)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 43)              // Prevents arrowhead from being covered by circle
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
        .append("svg:path")
          .attr("d", "M0,-5L10,0L0,5");

    // Add zoom and panning triggers
    this.zoom = d3.zoom()
      .scaleExtent([1 / 4, 4])
      .on('zoom', this.zoomed)
    svg.call(this.zoom)

    // A background grid to help user experience
    // The width and height depends on the minimum scale extent and
    // the + 10% and negative index to create an infinite grid feel
    // The precedence of this element is important since you'll have
    // click events on the elements above the grid
    this.selections.grid = svg.append('rect')
      .attr('x', '-10%')
      .attr('y', '-10%')
      .attr('width', '410%')
      .attr('height', '410%')
      .attr('fill', 'url(#grid)')

    this.selections.graph = svg.append("g")
    const graph = this.selections.graph

    // Node and link count is nice :)
    this.selections.stats = svg.append('text')
      .attr('x', '1%')
      .attr('y', '98%')
      .attr('text-anchor', 'left');

    // Some caption
    this.selections.caption = svg.append('g');
    this.selections.caption.append('rect')
      .attr('width', '200')
      .attr('height', '0')
      .attr('rx', '10')
      .attr('ry', '10')
      .attr('class', 'caption');
  },
  methods: {
    tick() {
      // If no data is passed to the Vue component, do nothing
      if (!this.data) { return }
      const transform = d => {
        return "translate(" + d.x + "," + d.y + ")"
      }

      const link = d => {
        return "M" + d.source.x + "," + d.source.y + " L" + d.target.x + "," + d.target.y
      }

      const graph = this.selections.graph
      graph.selectAll("path").attr("d", link)
      graph.selectAll("circle").attr("transform", transform)
      graph.selectAll("text").attr("transform", transform)

      this.updateNodeLinkCount()
    },
    updateData() {
      this.simulation.nodes(this.nodes)
      this.simulation.force("link").links(this.links)

      const simulation = this.simulation
      const graph = this.selections.graph

      // Links should only exit if not needed anymore
      graph.selectAll("path")
        .data(this.links)
      .exit().remove()

      graph.selectAll("path")
        .data(this.links)
      .enter().append("path")
        .attr("class", d => "link " + d.type)

      // Nodes should always be redrawn to avoid lines above them
      graph.selectAll("circle").remove()
      graph.selectAll("circle")
        .data(this.nodes)
      .enter().append("circle")
        .attr("r", 30)
        .attr("class", d => d.class)
        .call(d3.drag()
          .on('start', this.nodeDragStarted)
          .on('drag', this.nodeDragged)
          .on('end', this.nodeDragEnded))
        .on('mouseover', this.nodeMouseOver)
        .on('mouseout', this.nodeMouseOut)
        .on('click', this.nodeClick)

      graph.selectAll("text").remove()
      graph.selectAll("text")
        .data(this.nodes)
      .enter().append("text")
        .attr("x", 0)
        .attr("y", ".31em")
        .attr("text-anchor", "middle")
        .text(d => d.name)

      // Add 'marker-end' attribute to each path
      const svg = d3.select(this.$el.querySelector("svg"))
      svg.selectAll("g").selectAll("path").attr("marker-end", "url(#end)");

      // Update caption every time data changes
      this.updateCaption()
      simulation.alpha(1).restart()
    },
    updateForces() {
      const { simulation, forceProperties, width, height } = this
      simulation.force("center")
      .x(width * forceProperties.center.x)
      .y(height * forceProperties.center.y)
      simulation.force("charge")
        .strength(forceProperties.charge.strength * forceProperties.charge.enabled)
        .distanceMin(forceProperties.charge.distanceMin)
        .distanceMax(forceProperties.charge.distanceMax)
      simulation.force("collide")
        .strength(forceProperties.collide.strength * forceProperties.collide.enabled)
        .radius(forceProperties.collide.radius)
        .iterations(forceProperties.collide.iterations)
      simulation.force("forceX")
        .strength(forceProperties.forceX.strength * forceProperties.forceX.enabled)
        .x(width * forceProperties.forceX.x)
      simulation.force("forceY")
        .strength(forceProperties.forceY.strength * forceProperties.forceY.enabled)
        .y(height * forceProperties.forceY.y)
      simulation.force("link")
        .distance(forceProperties.link.distance)
        .iterations(forceProperties.link.iterations)

      // updates ignored until this is run
      // restarts the simulation (important if simulation has already slowed down)
      simulation.alpha(1).restart()
    },
    updateNodeLinkCount() {
      let nodeCount = this.nodes.length;
      let linkCount = this.links.length;

      const highlightedNodes = this.selections.graph.selectAll("circle.highlight");
      const highlightedLinks = this.selections.graph.selectAll("path.highlight");
      if (highlightedNodes.size() > 0 || highlightedLinks.size() > 0) {
        nodeCount = highlightedNodes.size()
        linkCount = highlightedLinks.size()
      }
      this.selections.stats.text('Nodes: ' + nodeCount + ' / Edges: ' + linkCount);
    },
    updateCaption() {
      // WARNING: Some gross math will happen here!
      const lineHeight = 30
      const lineMiddle = (lineHeight / 2)
      const captionXPadding = 28
      const captionYPadding = 5

      const caption = this.selections.caption;
      caption.select('rect')
        .attr('height', (captionYPadding * 2) + lineHeight *
          (this.classes.length + this.linkTypes.length))

      const linkLine = (d) => {
        const source = {
          x: captionXPadding + 13,
          y: captionYPadding + (lineMiddle + 1) + (lineHeight * this.linkTypes.indexOf(d)),
        }
        const target = {
          x: captionXPadding - 10,
        }
        return 'M' + source.x + ',' + source.y + 'H' + target.x
      }

      caption.selectAll('g').remove();
      const linkCaption = caption.append('g');
      linkCaption.selectAll('path')
        .data(this.linkTypes)
        .enter().append('path')
          .attr('d', linkLine)
          .attr('class', (d) => 'link ' + d)

      linkCaption.selectAll('text')
        .data(this.linkTypes)
        .enter().append('text')
          .attr('x', captionXPadding + 20)
          .attr('y', (d) => captionYPadding + (lineMiddle + 5) +
            (lineHeight * this.linkTypes.indexOf(d)))
          .attr('class', 'caption')
          .text((d) => d);

      const classCaption = caption.append('g');
      classCaption.selectAll('circle')
        .data(this.classes)
        .enter().append('circle')
          .attr('r', 10)
          .attr('cx', captionXPadding - 2)
          .attr('cy', (d) => captionYPadding + lineMiddle +
            (lineHeight * (this.linkTypes.length + this.classes.indexOf(d))))
          .attr('class', (d) => d.toLowerCase());

      classCaption.selectAll('text')
        .data(this.classes)
        .enter().append('text')
          .attr('x', captionXPadding + 20)
          .attr('y', (d) => captionYPadding + (lineMiddle + 5) +
            (lineHeight * (this.linkTypes.length + this.classes.indexOf(d))))
          .attr('class', 'caption')
          .text((d) => d);

      const captionWidth = caption.node().getBBox().width;
      const captionHeight = caption.node().getBBox().height;
      const paddingX = 18;
      const paddingY = 12;
      caption
        .attr('transform', 'translate(' +
          (this.width - captionWidth - paddingX) + ', ' +
          (this.height - captionHeight - paddingY) + ')');
    },
    zoomed() {
      const transform = d3.event.transform
      // The trick here is to move the grid in a way that the user doesn't perceive
      // that the axis aren't really moving
      // The actual movement is between 0 and gridSize only for x and y
      const translate = transform.x % (this.gridSize * transform.k) + ',' +
        transform.y % (this.gridSize * transform.k)
      this.selections.grid.attr('transform', 'translate(' +
        translate + ') scale(' + transform.k + ')')
      this.selections.graph.attr('transform', transform)

      // Define some world boundaries based on the graph total size
      // so we don't scroll indefinitely
      const graphBox = this.selections.graph.node().getBBox()
      const margin = 200
      const worldTopLeft = [graphBox.x - margin, graphBox.y - margin]
      const worldBottomRight = [
        graphBox.x + graphBox.width + margin,
        graphBox.y + graphBox.height + margin
      ]
      this.zoom.translateExtent([worldTopLeft, worldBottomRight])
    },
    nodeDragStarted(d) {
      if (!d3.event.active) { this.simulation.alphaTarget(0.3).restart() }
      d.fx = d.x
      d.fy = d.y
    },
    nodeDragged(d) {
      d.fx = d3.event.x
      d.fy = d3.event.y
    },
    nodeDragEnded(d) {
      if (!d3.event.active) { this.simulation.alphaTarget(0.0001) }
      d.fx = null
      d.fy = null
    },
    nodeMouseOver(d) {
      const graph = this.selections.graph
      const circle = graph.selectAll("circle")
      const path = graph.selectAll("path")
      const text = graph.selectAll("text")

      const related = []
      const relatedLinks = []
      related.push(d)
      this.simulation.force('link').links().forEach((link) => {
        if (link.source === d || link.target === d) {
          relatedLinks.push(link)
          if (related.indexOf(link.source) === -1) { related.push(link.source) }
          if (related.indexOf(link.target) === -1) { related.push(link.target) }
        }
      })
      circle.classed('faded', true)
      circle
        .filter((df) => related.indexOf(df) > -1)
        .classed('highlight', true)
      path.classed('faded', true)
      path
        .filter((df) => df.source === d || df.target === d)
        .classed('highlight', true)
      text.classed('faded', true)
      text
        .filter((df) => related.indexOf(df) > -1)
        .classed('highlight', true)
      // This ensures that tick is called so the node count is updated
      this.simulation.alphaTarget(0.0001).restart()
    },
    nodeMouseOut(d) {
      const graph = this.selections.graph
      const circle = graph.selectAll("circle")
      const path = graph.selectAll("path")
      const text = graph.selectAll("text")

      circle.classed('faded', false)
      circle.classed('highlight', false)
      path.classed('faded', false)
      path.classed('highlight', false)
      text.classed('faded', false)
      text.classed('highlight', false)
      // This ensures that tick is called so the node count is updated
      this.simulation.restart()
    },
    nodeClick(d) {
      const circle = this.selections.graph.selectAll("circle")
      circle.classed('selected', false)
      circle.filter((td) => td === d)
        .classed('selected', true)
    },
  },
  watch: {
    data: {
      handler(newData) {
        this.updateData()
      },
      deep: true
    },
    forceProperties: {
      handler(newForce) {
        this.updateForces()
      },
      deep: true
    }
  }
})


mockdata = {
    "nodes": [
        { "name": "firmware", "group":  1, "class": "system" },
        { "name": "loader",   "group":  1, "class": "system" },
        { "name": "kernel",   "group":  1, "class": "system" }
    ],
    "links": [
        { "source":  1,  "target":  0,  "value":  1, "type": "depends" },
        { "source":  2,  "target":  1,  "value":  8, "type": "depends" }
    ]
    }

mockdata2={
"nodes": [
{ "name": "firmware",               "group":  1, "class": "system" },
{ "name": "loader",                 "group":  1, "class": "system" },
{ "name": "kernel",                 "group":  1, "class": "system" },
{ "name": "systemd",                "group":  1, "class": "mount"  },
{ "name": "mount",                  "group":  2, "class": "mount"  },
{ "name": "init.scope",             "group":  1, "class": "init"   },
{ "name": "system.slice",           "group":  1, "class": "init"   },
{ "name": "system-getty.slice",     "group":  1, "class": "init"   },
{ "name": "systemd-initctl.socker", "group":  1, "class": "init"   },
{ "name": "tmp.mount",              "group":  1, "class": "init"   },
{ "name": "sys-devices",            "group":  2, "class": "init"   },
{ "name": "boot.mount",             "group":  2, "class": "mount"  },
{ "name": "boot.mount.2",           "group":  2, "class": "mount"  },
{ "name": "boot.mount.3",           "group":  2, "class": "mount"  },
{ "name": "boot.mount.4",           "group":  2, "class": "mount"  },
{ "name": "boot.mount.5",           "group":  2, "class": "mount"  }
],
"links": [
{ "source":  1,  "target":  0,  "value":  1, "type": "depends" },
{ "source":  2,  "target":  1,  "value":  8, "type": "depends" },
{ "source":  3,  "target":  2,  "value":  6, "type": "depends" },
{ "source":  4,  "target":  3,  "value":  1, "type": "needs"   },
{ "source":  4,  "target":  2,  "value":  5, "type": "needs"   },
{ "source":  5,  "target":  3,  "value":  1, "type": "needs"   },
{ "source":  6,  "target":  3,  "value":  1, "type": "needs"   },
{ "source":  7,  "target":  3,  "value":  1, "type": "needs"   },
{ "source":  8,  "target":  3,  "value":  2, "type": "needs"   },
{ "source":  9,  "target":  3,  "value":  1, "type": "needs"   },
{ "source": 11,  "target": 10,  "value":  1, "type": "depends" },
{ "source": 12,  "target":  3,  "value":  3, "type": "depends" },
{ "source": 13,  "target":  2,  "value":  3, "type": "depends" },
{ "source": 14,  "target":  2,  "value":  5, "type": "needs"   },
{ "source": 15,  "target":  2,  "value":  5, "type": "needs"   }
]
}

new Vue({
  el: '#app',
  data() {
    return {
      data: null,
      dataList: [mockdata],
    }
  },
  mounted() {
    this.changeData();
  },
  methods: {
    changeData() {
      const dataIndex = Math.floor(Math.random() * this.dataList.length)
      this.data = mockdata2
      d3.json('http://127.0.0.1:5000/test').then(data => {
        console.log(data)
        this.data = data
      }).catch(error => {
        console.error('Cannot proceed with simulation, failed to  retrieve data.')
      })
    }
  }
})
