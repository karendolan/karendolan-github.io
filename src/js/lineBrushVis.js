/* * * * * * * * * * * * * * * * *
*      class LineBrushVis        *
* * * * * * * * * * * * * * * * */

class LineBrushVis {

    // constructor method to initialize Timeline object
    constructor(_parentElement, _data) {
        this.parentElement = _parentElement;
        this.data = _data;
        this.displayData = [];
        this.displayData.statePob = [];
        this.displayData.countryPob = [];

        this.currentCensusYear = yearList[0];

        // Global variable
        this.GREY = "#696969";

        // call method initVis
        this.initVis();
    };

// init LineBrushVis
    initVis() {
        let vis = this;

        vis.margin = {top: 130, right: 250, bottom: 60, left: 90};
        vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right;
        vis.height = $("#" + vis.parentElement).height() - vis.margin.top - vis.margin.bottom;
        vis.padding = 10;

        // SVG drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        // clip path
        vis.svg.append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height);

        // add title
        vis.svg.append('g')
            .attr('class', 'title')
            .append('text')
            .text('Timeline Selector')
            .attr('transform', `translate(${vis.width / 2}, -130)`)
            .attr('text-anchor', 'middle');

        // add legend
        vis.legend = vis.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${vis.width/1.1} , 40)`);

        // title over legend
        vis.legend.append('text')
            .attr('class', 'legend-title-year')
            .text(`Nevada Census Year ${vis.currentCensusYear}`)
            .attr('transform', 'translate(100, 70)');

        // init scales
        vis.x = d3.scaleTime()
            .range([0, vis.width])
            // x domain doesn't change for this vis
            // Add extra year for more room for scrubber 1920
            .domain([parseDate(1859), parseDate(1921)]);

        vis.y = d3.scaleLinear().range([vis.height, 0]);

        // init x & y axis
        vis.xAxis = vis.svg.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + (vis.height + vis.padding) + ")");

        vis.yAxis = vis.svg.append("g")
            .attr("class", "axis axis--y")
            .attr("transform", `translate(-${vis.padding},0)`);


        // init pathGroup
        vis.pathGroup = vis.svg
            .append('g')
            .attr('class', 'pathGroup')
            .attr("transform", "translate(0, -45)");

        // --------------------------
        // text label for the y axis
        vis.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - vis.margin.left - 5)
            .attr("x",0 - (vis.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Number of People");

        // --- Tool tip Line over Timeline ------------------------
        // init tooltipGroup
        vis.toolTipGroup = vis.pathGroup.append("g")
            .attr("class", "tooltip")
            .style("opacity", 1.0)
            // .style("display", "none");

        vis.toolTipLine = vis.toolTipGroup.append("line")
            .attr("class", "tooltipline")
            .style("stroke", vis.GREY)
            .style("fill", vis.GREY)
            .style("stroke-width", "3px")
            .attr("y1", vis.height + 80)
            .attr("y2", -20)
            .attr("x1", 0)
            .attr("x2", 2);

        vis.toolTipHistory = vis.toolTipGroup.append("div")
            .attr("class", "tooltip-history")
            .attr("x", 10)
            .attr("y", 0)
            .style("stroke", vis.GREY)
            .style("fill", vis.GREY)
            .text("");

        // ----- historical tool tip
        vis.historicalToolTip = vis.svg.append("foreignObject")
            .attr("width", 350)
            .attr("height", 200)
            .attr('x', vis.padding + 5)
            .attr('y', -120) // move high up
            .attr('class', 'historical-text-tooltip')
            .append("xhtml:body")
            .style("font", "14px 'Helvetica Neue'");

        vis.toolTipListener = vis.svg.append("rect")
            .attr("x", -vis.padding) // listen early
            .attr("y", -80) // listen high
            .attr("class", "tooltip-listener")
            .attr("width", vis.width + vis.padding) //listen late
            .attr("height", vis.height + 100) // listen low
            .style("fill", "transparent")
            .on('mousemove', function (event, d) {
                vis.mousemoveTooltip(event, vis, d);
            })
            .on("mouseover", function () {
                // console.log("over tool tip listener");
                //d3.select(".tooltip").style("display", null);
            })
            .on("mouseout", function () {
                // console.log("out tool tip listener");
                //d3.select(".tooltip").style("display", "none");
            })

        //-----------
        // ----- historical events group
        vis.historicalGroup = vis.svg
            .append('g')
            .attr('class', 'historyGroup')

        //-----------
        // ----- census marker group
        vis.censusMarkerGroup = vis.svg
            .append('g')
            .attr('class', 'censusMarkersGroup')

        // append tooltip
        vis.tooltip = d3.select("body").append('div')
            .attr('class', "tooltip")
            .attr('id', 'brushTooltip')

        // path group, added last for line hover
        vis.linePathGroup = vis.svg.append('g')
            .attr('class', 'linepathGroup')
            .attr('transform', `translate(0,0)`);

        // init basic data processing
        this.wrangleDataStatic();
    };

    // init basic data processing - prepares data for brush - done only once
    wrangleDataStatic() {
        let vis = this;

        viewsOpts.forEach((view) => {
            // only get the top 11 from each view
            // Global variable
            let topByView = topPobByView[view];
            let filtered = vis.data.filter(d =>  {
                return (topByView.find(e => {
                    return e.location == d[view];
                }));
            });

            // Group by type (state or country)
            let pobGroup = d3.group(filtered, d => d[view]);
            // get totals
            let pobTotals = Array.from((pobGroup),
                ([key, array]) => ({key: key, value: array.length})
            );
            // Sort by highest total
            pobTotals.sort((a, b) => {
                return (b.value - a.value);
            });
            // Only keep top 7
            let sliceMax = pobTotals.length > 7 ? 7 : pobTotals.length;
            let slicedNames = pobTotals.slice(0, sliceMax).map(d => d.key);
            // add to display data
            slicedNames.forEach(name => {
                let place = pobGroup.get(name);
                let yearGroup = d3.group(place, d => d.year);
                yearList.forEach(year => {
                    let gYear = yearGroup.get(year);
                    vis.displayData[view].push({
                        POBirth: name,
                        Total: gYear ? gYear.length : 0,
                        Year: parseDate(year),

                    })
                })
            })
        })

        // console.log("Initial LineBrushVis data", vis.displayData);
        this.wrangleData();
    };

    // wrangleData - gets called when toggling between country and state view is selected
    wrangleData() {
        let vis = this;

        // Option to exclude people born in  USA or Nevada
        if (!includeNative) {
            vis.filteredData = vis.displayData[placeView].filter(d => {
                // console.log(d.POBirth);
                return d.POBirth !== "United States of America" && d.POBirth !== "Nevada"
            });
        } else {
            vis.filteredData = vis.displayData[placeView];
        }

        // Update the visualization
        this.updateVis();
    };

    // updateVis
    updateVis() {

        let vis = this;
        let placeKeys = Object.keys(vis.filteredData);
        let extent = d3.extent(vis.filteredData, d => d.Total);

        // ---------------------------------------
        // https://www.d3-graph-gallery.com/graph/line_several_group.html
        // group the data: then draw one line per group
        // nest function allows to group the calculation per level of a factor
        vis.sumstat = d3.nest()
            .key(d => d.POBirth)
            .entries(vis.filteredData);

        // update domain
        vis.y.domain(d3.extent(vis.filteredData, d => d.Total));

        // draw x & y axis
        vis.xAxis.transition().duration(400)
            .call(d3.axisBottom(vis.x)
                .ticks(5));
        vis.yAxis.transition().duration(400)
            .call(d3.axisLeft(vis.y).ticks(5));

        // Draw the line
        //        vis.lines = vis.svg.selectAll(".line")
        vis.lines = vis.linePathGroup.selectAll(".line")
            .data(vis.sumstat, d => d.key);

        //exit, remove
        vis.lines.exit().remove();

        //Enter
        vis.lines
            .enter()
            .append("path")
            .attr("fill", "none")
            .attr("class", d => `line placePob ${getPlaceClassId(d.key)} ${getPlaceClassId()}`)
            .attr("stroke", d => hookColor(d.key))
            .attr("stroke-width", 4)
            .attr("d", function (d) {
                return d3.line()
                    .x(function (d) {
                        return vis.x(d.Year);
                    })
                    .y(function (d) {
                        return vis.y(+d.Total);
                    })
                    (d.values)
            })
        //Merge
        vis.lines.merge(vis.lines)
            .attr("d", function (d) {
                return d3.line()
                    .x(function (d) {
                        return vis.x(d.Year);
                    })
                    .y(function (d) {
                        return vis.y(+d.Total);
                    })
                    (d.values)
            })

        // ---------------------------------
        // add  census marker lines
        // ---------------------------------

        vis.censusMarkerLines = vis.censusMarkerGroup.selectAll(".census-date-line")
            .data(yearList);

        //exit, remove
        vis.censusMarkerLines.exit().remove();

        //Enter
        vis.censusMarkerLines
            .enter()
            .append("line")
            .attr("class", "census-date-line")
            .style("stroke", "#CDCDCD")
            .style("fill", "#CDCDCD")
            .style("stroke-width", "2px")
            .attr("y1", vis.height + vis.padding)
            .attr("y2", -vis.padding)
            .attr("x1", 0)
            .attr("x2", 2)
            .attr('transform', function (d, i) {
                let parsedDate = parseDate(d);
                let pos = vis.x(parsedDate);
                return "translate(" + pos + ",0)";
            })
            .attr("class", d => `censusMarkerLines placePob ${getPlaceClassId(d.key)} ${getPlaceClassId()}`)
            .on('mouseover', function (event, d) {
                vis.mousemoveTooltip(event, vis, d);
            })

        //Merge
        vis.censusMarkerLines.merge(vis.censusMarkerLines);

        // -------------------------------------
       vis.updateVisLegend();
    }

    // Legend is updated each time the census date changes
    updateVisLegend() {
        let vis = this;

        vis.dotFilterData = vis.filteredData.filter(d => d.Year.getFullYear() === vis.currentCensusYear);

        // Sort by largest first
        vis.dotFilterData.sort((a,b) => {
            return b.Total - a.Total;
        })

        // -------------------------------------
        // Dot legend inspired by the legend at https://www.d3-graph-gallery.com/graph/custom_legend.html
        // -------------------------------------
        vis.dots = vis.legend.selectAll(".legend-dot")
            .data(vis.dotFilterData, d => d.POBirth);

        //exit, remove
        vis.dots.exit().remove();

        let dotsEnter = vis.dots.enter()
            .append("circle")
            .attr("class", d => `legend-dot placePob ${getPlaceClassId(d.POBirth)} ${getPlaceClassId()}`)
            .attr("cx", 100)
            .attr("cy", (d, i) => 100 + i * 20)
            .attr("r", d => {
                return 8;
            })
            .style("fill", d => {
                // console.log("line color", d.POBirth, hookColor(d.POBirth), hookColor.domain());
                return hookColor(d.POBirth);
            })
        // merge
        dotsEnter.merge(vis.dots)
            .attr("cy", (d, i) => 100 + i * 20)
            .attr("r", d => {
                return 8;
            })
            .style("fill", d => {
                // console.log("line color", d.POBirth, hookColor(d.POBirth), hookColor.domain());
                return hookColor(d.POBirth);
            })

        // Add one dot in the legend for each name.
        vis.dotLabels = vis.legend.selectAll(".legend-label")
            .data(vis.dotFilterData, d => d.POBirth);

        //exit, remove
        vis.dotLabels.exit().remove();

        let dotlabelsEnter = vis.dotLabels.enter()
            .append("text")
            .attr("class", d=> {
                return  `legend-label placePob legend-label-${getPlaceClassId(d.POBirth)} ${getPlaceClassId(d.POBirth)} ${getPlaceClassId()}`;
            })
            .attr("x", 120)
            .attr("y", (d, i) => 100 + i * 20) // 100 is where the first dot appears. 25 is the distance between dots
            .style("fill", d => hookColor(d.POBirth))
            .text(d => {
                return `${d.POBirth} (${d.Total.toLocaleString()})`
            })
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")

        // merge
        dotlabelsEnter.merge(vis.dotLabels)
            .attr("y", (d, i) => 100 + i * 20) // 100 is where the first dot appears. 25 is the distance between dots
            .text(d => {
                return `${d.POBirth} (${d.Total.toLocaleString()})`
            })

    };

    // Hightlight target line
    handlePlaceOver(vis, placeClass) {
        d3.selectAll('.line.placePob')
            .transition()
            .duration(400)
            .attr("opacity", .2);
        d3.selectAll('.legend-label.placePob')
            .transition()
            .duration(400)
            .attr("opacity", .2);

        d3.selectAll(`.${placeClass}` )
            .transition()
            .duration(10)
            .attr("opacity", 1);
    }
    // UnHightlight target line
    handlePlaceOut(vis) {
        //d3.selectAll('.line.placePob')
        //    .transition()
        //    .duration(300)
        //    .attr("opacity", 1);
    }

    // Construct historical text for current census year and placeView
    historicalText(year) {
        let data = historicalHookInsights[placeView].find(e => e.year === year);
        if (data) {
            let htmlText = `<dl><dt class="mb-2">${year}</dt>`;
            data.text.forEach(t => {
                htmlText = htmlText + `<dd class="ml-2">${t}</dd>`
            });
            return htmlText + "</dl>";
        } else {
            return `No history for ${year}`;
        }
    }

    // For inline history
    historicalMouseOver(vis, event, year) {
        vis.historicalToolTip
            .html(`${vis.historicalText(year)}`);
    }

    historicalMouseOut(vis) {
        vis.svg.selectAll('.historical-text-tooltip').remove();
    }

    getHighestPlace(vis, year) {
        let temp = vis.filteredData.filter(d => d.Year.getFullYear() === year.getFullYear());
        return d3.least(d3.rollup(temp, v => d3.sum(v, d => d.Total), d => d.POBirth), ([, sum]) => -sum);
    }

    getHighestGrowthPlace(vis, year) {
        let temp = vis.filteredData.filter(d => d.Year.getFullYear() === year.getFullYear());
        return d3.least(d3.rollup(temp, v => d3.sum(v, d => d.Total), d => d.POBirth), ([, sum]) => -sum);
    }

    // Tool tip mouse function
    mousemoveTooltip(event, vis) {
        console.log("mousemoveTooltip start", new Date());
        let xPos = d3.pointer(event)[0]; // get the x position of mouse pointer
        // get the xscale invert
        let xDate = vis.x.invert(xPos);
        // get closest year
        let xYear = xDate.getMonth() > 5 ? xDate.getFullYear() + 1: xDate.getFullYear();
        // console.log("X date", xDate, xYear);
        let bisectDate = d3.bisector(d => d).right;
        let dateIndex = bisectDate(yearList, xYear);
        dateIndex = dateIndex == 0 ? 0 : dateIndex - 1;
        let year = yearList[dateIndex];
        // convert back to Date
        year = parseDate(year);
        // console.log("date index", year);
        // get data element from te index
        let top = vis.getHighestPlace(vis, year);
        //let elem = vis.filteredData[dateIndex];
        // shift tooltip group on x-axis to position of mouse
        vis.toolTipGroup
            .attr("transform", `translate(${vis.x(xDate)},0)`);

        // also shift the svg tooltip
        vis.svg.select('foreignObject').attr("x", vis.x(xDate) + vis.padding);

        // update tooltip text with date and top population values
        let topFobText = `Largest group born in ${top[0]}, ${top[1]}`;
        // vis.toolTipTopFOBirth.text(topFobText);
        // Update the global date range selector
        let yearStr = formatDate(year);
        vis.currentCensusYear = year.getFullYear();
        vis.historicalMouseOver(vis, event, year.getFullYear());
        // Update dot legend
        vis.updateVisLegend();
        // update dotLegend title
        vis.svg.select('.legend-title-year')
            .text(`Nevada Census Year ${vis.currentCensusYear}`)

        if (lowDate !== yearStr && highDate !== yearStr) {
            lowDate = yearStr;
            highDate = yearStr;
            selectedTimeRange = [yearStr, yearStr];
            updateVisualizationHook();
        }
        console.log("mousemoveTooltip end", new Date());

    }
}