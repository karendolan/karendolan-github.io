/* * * * * * * * * * * * * * * * * *
 *      RisingInsightMorphVis       *
 * * * * * * * * * * * * * * * * * */

// helper to sum the count in the array
const v2SumArrayReducer = (accumulator, currentValue) => accumulator + currentValue;

// A guide on how to filter by checkbox selection
const v2CheckBoxGuide = {
    "checkbox-gender-female": {attr: "Sex", value: "F", cond: "EQ", title: "Gender is Female"},
    "checkbox-gender-male": {attr: "Sex", value: "M", cond: "EQ", title: "Gender is Male"},
    "checkbox-age-adult": {attr: "Age", value: "18", cond: "GT", title: "Over 18 years old in first census"},
    "checkbox-age-child": {attr: "Age", value: "13", cond: "LT", title: "Under 13 years of age in first census"},
    // special case
    "checkbox-age-teen": {attr: "Age", value: "", cond: "not-child-or-adult", title: "From 13 to 18 years old in first census"},
    "checkbox-NV": {attr: "statePob", value: "Nevada", cond: "EQ", title: "Born in Nevada"},
    "checkbox-non-NV": {attr: "statePob", value: "Nevada", cond: "NOT_EQ", title: "No born in Nevada"},
    "checkbox-USA": {attr: "countryPob", value: "United States of America", cond: "EQ", title: "Born in the USA"},
    "checkbox-non-USA": {attr: "countryPob", value: "United States of America", cond: "NOT_EQ", title: "Not born in the USA"},
    "checkbox-white": {attr: "Color", value: "W", cond: "EQ", title: "Is 'color W'"},
    "checkbox-non-white": {attr: "Color", value: "W", cond: "NOT_EQ", title: "Is not 'color W'"},
};
// the class on all the above input checkbox elements
const v2CheckBoxClass = "v2-checkbox-input";

const v2RectData = [
    {id: "in-0-Census", name: "", count: 0, title: ""}, // ignore 0 census with current attribute set
    {id: "in-1-Census", name: "In 1 Census", count: 1, title: "At least 1 year"},
    {id: "in-2-Census", name: "In 2 Census", count: 2, title: "At least 10 years"},
    {id: "in-3-Census", name: "In 3 Census", count: 3, title: "At least 20 years"},
    {id: "in-4-Census", name: "In 4 Census", count: 4, title: "At least 30 years"},
]

class DistanceVis {

    // constructor method to initialize object
    constructor(parentElement, data) {

        this.parentElement = parentElement;
        this.rawData = data;
        this.preProcessedData = [];
        this.filteredData = [];
        this.displayData = [];
        this.initVis()
    }

    // Initialize the SVG main components prior to data wrangling
    initVis(){
        let vis = this;

        // empty initial filters
        vis.filters = [];
        // Set a color for dots
        vis.color = d3.scaleOrdinal()
            // Adobe Color Analogous
            .range(["#F7DC28", "#D9AE23", "#D98A23", "#F77E28", "#F0B132"])
            // set color domain to number of census years
            .domain(v2RectData.map(d => d.count).reverse())

        // set a color for background boxes
        vis.rectColor = d3.scaleOrdinal()
            //https://colorbrewer2.org/#type=sequential&scheme=Greys&n=7
            .range(['#f7f7f7','#d9d9d9','#bdbdbd','#969696','#737373','#525252','#252525'])
            .domain(v2RectData.map(d=>d.id))

        // Set sizing of the SVG
        vis.margin = {top: 40, right: 10, bottom: 20, left: 10};
        vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right;
        vis.height = $("#" + vis.parentElement).height() - vis.margin.top - vis.margin.bottom;
        vis.buffer = 40;

        // For the dots
        // Scale the cells on the smaller height or width of the SVG
        // let cellScaler = vis.height > vis.width ? vis.width: vis.height;
        vis.cellHeight = vis.width / (15 * v2RectData.length) ;
        vis.cellWidth = vis.cellHeight;
        vis.cellPadding = vis.cellHeight / 4;

        // For the rects
        vis.rectPadding = 10;
        vis.rectWidth = vis.width/(v2RectData.length) - vis.rectPadding; // fit all the rects in width wise
        vis.rectHeight = vis.rectWidth; //square


        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr('transform', `translate (0, ${vis.margin.top})`);

        // append a tooltip
        vis.tooltip = d3.select("body").append('div')
            .attr('class', "tooltip")
            .attr('id', 'distanceVisToolTip');

        // The cell group that *must underlay* the rectangles for rect hover
        vis.cellGroup = vis.svg.append("g")
            .attr("class", "cell-group")
            // slightly more offset than the rect group
            .attr("transform", `translate(0, ${vis.buffer + 3 * vis.cellPadding})`);


        // The background rectangle group that *overlays* the dots (for hover) ----
        vis.rectGroup = vis.svg.append("g")
            .attr("class", "rect-container")
            // move down to give room to legend
            .attr("transform", `translate(0, ${vis.buffer})`);

        // ------ build a grid of cells ---
        vis.rects = vis.rectGroup
            .selectAll(".census-rect")
            .data(v2RectData)
            .enter()
            .append("rect")
            .attr("class", d =>`census-rect rect-${d.id}`)
            .attr("x", (d,i) => i * vis.rectWidth + vis.rectPadding)
            .attr("y", (d,i) => vis.rectPadding) // same y for each rect //Math.floor(i % 100 / 10);
            .attr("width", d => d.id === "NV" ? vis.rectWidth/3 : vis.rectWidth)
            .attr("height", vis.rectHeight)
            .attr("fill", "#f7f7f7")
            .attr("stroke", "black")
            .attr("opacity", d => {
                if (d.count === 0) {
                    return 0; // because nothing falls into 0 census with the current attribute set
                } else {
                    return 0.3 // for dots to to be seen through it
                }
            })
            .attr("stroke-width", 4)
            .on('mouseover', function(event, d) {
                vis.handleMouseOver(vis, event, d);
            })
            .on('mouseout', function(event, d) {
                vis.handleMouseOut(vis, event, d);
            });

        // legend to describe the color and shape
        vis.legend = vis.svg.append('g')
            .attr('class', 'v2-legend-group')
            .attr("transform", `translate(0, 10)`);

        // All top row labels to the rectangles
        vis.labelTopGroup = vis.svg.append('g')
            .attr('class', 'v2-label-group-top')
            .attr("transform", `translate(10, 20)`);

        vis.labels = vis.labelTopGroup
            .selectAll(".census-rect-label-top")
            .data(v2RectData)
            .enter()
            .append("text")
            .attr("class", "census-rect-label-top")
            .attr("x", (d,i) => i * vis.rectWidth )
            .attr("y", 0)
            .style("fill", "black")
            .text(d => {
                return ` ${d.title}`;
            })
            .attr("text-anchor", "center")
            .style("alignment-baseline", "middle")

        // Add labels to the rectangles
        vis.labelGroup = vis.svg.append('g')
            .attr('class', 'v2-label-group')
            .attr("transform", `translate(10, 40)`);

        vis.labels = vis.labelGroup
            .selectAll(".census-rect-label")
            .data(v2RectData)
            .enter()
            .append("text")
            .attr("class", "census-rect-label")
            .attr("x", (d,i) => i * vis.rectWidth )
            .attr("y", 0)
            .style("fill", "black")
            .text(d => {
                return ` ${d.name}`;
            })
            .attr("text-anchor", "center")
            .style("alignment-baseline", "middle")

        vis.wrangleStaticData();
    }

    // Initial filtering
    wrangleStaticData() {
        let vis = this;
        vis.preProcessedData = [];
        let pidMap =  d3.group(vis.rawData, d => d.pid);
        // Group by potential PID
        let pidSize =  Array.from(d3.rollup(vis.rawData, v => v.length, d => d.pid));
        pidSize.forEach(a => {
            // Filter out pid with too many entries
            if (a[1] > 6) return;
            let pidRows = pidMap.get(a[0]);
            let pidYears = d3.map(pidRows, d => d.Year).keys();
            // Filter out entries with duplicate years
            if (pidYears.length !== pidRows.length) return;
            // Sort to find the earliest census year for the PID
            pidRows.sort((a,b) => {
                return a.Year - b.Year;
            })
            // Filter out first census ages of greater than 45
            // Omit older immigration to avoid death vs emigration
            if (pidRows[0]["Five Year"] > 45) return;
            // Omit Census entries that came in 1920 (can't tell if they stayed)
            if (pidRows[0].Year === 1920) return;
            // Add a new attribute for the number of census counts for the pid
            pidRows[0].censusCount = pidRows.length;
            // Only keep track of the first Census row for each unfiltered pid.
            vis.preProcessedData.push(pidRows[0]);
        });
        // console.log("pidGrouping", vis.preProcessedData);
        // Initially unfiltered
        vis.filteredData = vis.preProcessedData;
        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;

        // reset display data
        vis.displayData = [];

        // Map on censusCount
        vis.censusCountGroup = d3.nest()
            .key(d => d.censusCount)
            .entries(vis.filteredData);

        // console.log("censusCountGroup", vis.censusCountGroup);
        // 0: {key: "1", values: Array(113,347)}
        // 1: {key: "2", values: Array(6,737)}
        // 2: {key: "3", values: Array(680)}
        // 3: {key: "4", values: Array(51)}
        // for each group, get it's percentage
        let totalFiltered = vis.filteredData.length;
        let percentages = vis.censusCountGroup.map(c =>{
            return Math.ceil((c.values.length/totalFiltered)*100);
        });
        // -----------------------
        // penalize the largest census group for count to add to 100
        // iterate backwards over the array
        let evenCount = 100;
        let curCount = percentages.reduce((a, b) => a + b, 0);
        if (curCount !== evenCount) {
            let largestPerIndex = percentages.indexOf(Math.max(...percentages));
            let diff = evenCount - curCount;
            percentages[largestPerIndex] = percentages[largestPerIndex] + diff;
        }
        // ---- end penalize ---

        // Generalize the attributes of the percent who stayed and percent who left
        let tempData = [];
        vis.legendData = []
        let i = 0;
        // Make 100 data entries
        percentages.forEach((percent,i) => {
            for (let j = percent; j > 0 ; j--) {
                // push identical objects to match percentage count
                let censusCount = 0;
                if ( vis.censusCountGroup.length > 0) {
                    censusCount = vis.censusCountGroup[i].key;
                }
                tempData.push({
                    censusCount: censusCount,
                    censusPercent: percent,
                })
            }
        });
        // special data for legend
        percentages.forEach((p,i) => {
            let censusCount, entryCount;
            // check if there were 0 census results from the filter
            if (vis.censusCountGroup.length === 0) {
                entryCount = vis.filteredData.length;
                censusCount = 0;
            } else {
                entryCount = vis.censusCountGroup[i].values.length;
                censusCount = vis.censusCountGroup[i].key;
            }
            vis.legendData.push({
                censusCount: censusCount,
                censusPercent: p,
                entryCount: entryCount
            })
        });

        // sort by largest group
        vis.legendData.sort((a,b) => {
            return b.entryCount -  a.entryCount;
        });


        vis.insights = [];
        // vis.insightList = ['pobMap', 'genderMap', 'ageMap', 'jobMap', 'censusMap', 'colorMap', 'countyMap' ];

        // mine attributes
        vis.censusCountGroup.forEach(g => {
            let key = g.key;
            vis.insights[key] = {
                total: g.values.length,
                pobMap: function() {
                    let temp = g.values.map(d => d.pob);
                    const result = temp.reduce((a, c) => a.set(c, (a.get(c) || 0) + 1), new Map());
                    // console.log(result);
                    return result;
                }(),
                genderMap: function() {
                    let temp = g.values.map(d => d.Sex);
                    const result = temp.reduce((a, c) => a.set(c, (a.get(c) || 0) + 1), new Map());
                    // console.log(result);
                    return result;
                }(),
                ageMap: function() {
                    let temp = g.values.map(d => d.AgeFiveYearGroup);
                    const result = temp.reduce((a, c) => a.set(c, (a.get(c) || 0) + 1), new Map());
                    // console.log(result);
                    return result;
                }(),
                jobMap: function() {
                    let temp = g.values.map(d => d["Profession"]);
                    const result = temp.reduce((a, c) => a.set(c, (a.get(c) || 0) + 1), new Map());
                    // console.log(result);
                    return result;
                }(),
                censusMap: function() {
                    let temp = g.values.map(d => d["Year"]);
                    const result = temp.reduce((a, c) => a.set(c, (a.get(c) || 0) + 1), new Map());
                    // console.log(result);
                    return result;
                }(),
                colorMap:function() {
                    let temp = g.values.map(d => d["Color"]);
                    const result = temp.reduce((a, c) => a.set(c, (a.get(c) || 0) + 1), new Map());
                    // console.log(result);
                    return result;
                }(),
                countyMap:function() {
                    let temp = g.values.map(d => d["County"]);
                    const result = temp.reduce((a, c) => a.set(c, (a.get(c) || 0) + 1), new Map());
                    // console.log(result);
                    return result;
                }(),
            };
        })
        // d3.greatest(vis.insights[0].pobMap, (a, b) => d3.ascending(a[1], b[1]))
        // console.log("vis.insights", vis.insights);

        //sort by census count
        tempData.sort((a,b) => {
            return parseInt(a.censusCount) - parseInt(b.censusCount);
        })

        vis.displayData = tempData;
        vis.updateVis();
    }

    // Update the visualization
    updateVis() {
        let vis = this;
        let dataIndex = 0;
        // add the dots to the rects
        // keep track of how many dots per rect
        // The other filtered group
        let rectDotTrackerThem = [0,0,0,0,0];
        // The selected group
        let rectDotTrackerUsX = [0,0,0,0,0];
        let rectDotTrackerUsY = [0,0,0,0,0];

        // ------ build a grid of cells ---
        vis.cells = vis.cellGroup
            .selectAll(".percent-cell")
            .data(vis.displayData);

        //---  exit remove
        vis.cells.exit()
            .transition()
            .duration(500)
            .attr("width", 0)
            .remove();

        //-- enter append new cells
        vis.cells.enter()
            .append('rect')
            .merge(vis.cells)
            .interrupt() // interrupt the active transition
            .transition()
            .delay(10)
            .duration(500)
            .attr("class", (d,i) => {
                return`cell percent-cell percent-cell-${i} percent-cell-count-${d.censusCount}`
            })
            .attr("fill", d=> vis.color(d.censusCount))
            .attr("rx", d => {
                if (d.censusCount == 1) {
                    // circle
                    return vis.cellWidth;
                } else {
                    // square
                    return 0;
                }
            })
            .attr("ry", d => {
                if (d.censusCount == 1) {
                    // circle
                    return vis.cellWidth;
                } else {
                    // square
                    return 0;
                }
            })
            .attr("x", (d,i) => {
                let rectCount = rectDotTrackerUsX[d.censusCount]++;
                let x0 = Math.floor(rectCount / 100) % 10;
                let x1 = Math.floor(rectCount % 10);
                let relativeX =  vis.cellPadding * x0 + (vis.cellPadding + vis.cellWidth) * (x1 + x0 * 10);
                // position to the box to be placed in 0-4
                let result = relativeX + (d.censusCount * vis.rectWidth + 2 * vis.rectPadding);
                //console.log("CELL X", rectDotTrackerUsX[d.censusCount], "census ",d.censusCount, " x pos " , result, d);
                return relativeX + (d.censusCount * vis.rectWidth + 2 * vis.rectPadding);
            })
            .attr("y", (d,i) => {
                let rectCount = rectDotTrackerUsY[d.censusCount]++;
                let y0 = Math.floor(rectCount / 1000);
                let y1 = Math.floor(rectCount % 100 / 10);
                let result = vis.cellPadding * y0 + (vis.cellPadding + vis.cellWidth) * (y1 + y0 * 10) + vis.rectPadding;
                // console.log("CELL Y", rectDotTrackerUsY[d.censusCount], "census ",d.censusCount," y pos " , result, d);
                return result;
            })
            .attr("width", vis.cellWidth)
            .attr("height", vis.cellWidth)


        // -------------------------------------
        // update legend
        vis.dots = vis.legend
            .selectAll(".legend-dot")
            // special legend param
            .data(vis.legendData)

        //exit, remove
        vis.dots.exit().remove();

        // add new dots
        vis.dots.enter()
            .append('rect')
            .merge(vis.dots)
            .attr("class", (d,i) => `legend-dot percent-cell-count-${d.censusCount}`)
            .attr("rx", d => {
                if (d.censusCount == 1) {
                    // circle
                    return vis.cellWidth - vis.cellPadding;
                } else {
                    // square
                    return 0
                }
            })
            .attr("ry", d => {
                if (d.censusCount == 1) {
                    // circle
                    return vis.cellWidth - vis.cellPadding;
                } else {
                    // square
                    return 0
                }
            })
            .attr("x", 10)
            .attr("y", (d,i) => vis.buffer + i * 20)
            .attr("width", vis.cellWidth - vis.cellPadding)
            .attr("height", vis.cellWidth - vis.cellPadding)
            .attr("fill", d=> vis.color(d.censusCount))

        // Add one dot in the legend for each name.
        vis.dotLabels = vis.legend.selectAll(".v2-legend-label")
            .data(vis.legendData);

        //exit, remove
        vis.dotLabels.exit().remove();

        // enter
        vis.dotLabels.enter()
            .append("text")
            .attr("class", "v2-legend-label census-matrix-legend-text")
            .attr("x", 25) // same for all to offset from dot/square
            .style("fill", "black")
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")
            .merge(vis.dotLabels)
            .attr("y", (d, i) => 5 + vis.buffer + i * 20)
            .text(d => {
                return `are in ${d.censusCount} census (${d.censusPercent}%)`;
            });

    }

    // Create a SQUARE path
    squarePath (x, y, l) {
        return "M" + x + "," + y + " " +
            "m" + -l/2 + ",0 " +
            "m" + "0," + -l/2 + " " +
            "h" + "0," + l + " " +
            "v" + l + ",0 " + // l + " " +
            "h 0," + -l + " " + //,0 " +
            "v0,0Z";
    }

    // Create a CIRCLE path
    circlePath (x, y, r) {
        return "M" + x + "," + y + " " +
            "m" + -r + ", 0 " +
            "a" + r + "," + r + " 0 1,0 " + r * 2 + ",0 " +
            "a" + r + "," + r + " 0 1,0 " + -r * 2 + ",0Z";
    }

    // Mouse over event of place
    handleMouseOver (vis, event, d) {
        // console.log("hover over", d);
        let leftPosition = event.pageX + 10 + "px";
        if (window.innerWidth - event.pageX < 500) {
            leftPosition = event.pageX - 300 + "px";
        }
        let census = vis.insights[d.count];
        let censusCount = d.count;
        let peopleCount = census ? census.total : 0;
        let censusPercent =  vis.legendData.find(c => c.censusCount == d.count);
        censusPercent =  censusPercent? censusPercent.censusPercent : 0;
        if ((d.count === 0 && vis.filters.length === 0) || !census) {
            vis.tooltip
                .style("opacity", 1)
                .style("left", leftPosition)
                .style("top", event.pageY + "px")
                .html(`
                <div class="toolTip" >
                    <h5>${censusPercent}% of people are in ${censusCount} census (${peopleCount.toLocaleString("en")})</h5>
                </div>`
                );
        } else if (d.count === 0) {
            let tipText = `<div>${peopleCount.toLocaleString("en")} people with filter attribute</div> `;
            vis.filters.forEach(f => {
                tipText += `<div>${v2CheckBoxGuide[f].title}.</div> `;
            })
            vis.tooltip
                .style("opacity", 1)
                .style("left", leftPosition)
                .style("top", event.pageY + "px")
                .html(`
                <div class="toolTip" >
                    <h5>${censusPercent}% of people are in ${censusCount} census (${peopleCount.toLocaleString("en")})</h5>
                    ${tipText}
                </div>`
            );
        } else {
            // They show up in a census
            let topPob = d3.greatest(census.pobMap, (a, b) => d3.ascending(a[1], b[1]));
            let topAgeGroup = d3.greatest(census.ageMap, (a, b) => d3.ascending(a[1], b[1]));
            let topCensus = d3.greatest(census.censusMap, (a, b) => d3.ascending(a[1], b[1]));
            let topGender = d3.greatest(census.genderMap, (a, b) => d3.ascending(a[1], b[1]));
            let topColor = d3.greatest(census.colorMap, (a, b) => d3.ascending(a[1], b[1]));
            let topJob = d3.greatest(census.jobMap, (a, b) => d3.ascending(a[1], b[1]));
            let topCounty = d3.greatest(census.countyMap, (a, b) => d3.ascending(a[1], b[1]));
            // console.log(topPob,topAgeGroup, topCensus );
            vis.tooltip
                .style("opacity", 1)
                .style("left", leftPosition)
                .style("top", event.pageY + "px")
                .html(`
                <div class="toolTip" >
                    <h5>${censusPercent}% of people are in ${censusCount} census</h5>
                    <div> The ${peopleCount.toLocaleString("en")} people in ${censusCount} census are most likely</div>
                    <div> to be born in ${topPob[0]} living in ${upperCaseFirstLetters(topCounty[0])}, Nevada. </div> 
                    <div> Their first census was at age ${topAgeGroup[0]} in year ${topCensus[0]}. </div>   
                    <div> Gender "${topGender[0]}", "color ${topColor[0]}",
                     and job "${upperCaseFirstLetters(topJob[0])}".</div>   
                </div>`
                );
        }
    };

    // Mouse out event, hide tooltip
    handleMouseOut(vis, event, d) {
        // console.log("hover out", d);
        //Put tool tip back
        vis.tooltip
            .style("opacity", 0)
            .style("left", 0)
            .style("top", 0)
            .html(``);
    };

    // Find the checkboxes that are checked
    // filter the data and call wrangle()
    handleChange(vis, element) {
        // if born in NV is checked, disable non-USA
        if (element.id === "checkbox-NV") {
            $("#checkbox-non-USA").prop("checked", false);
        }
        if (element.id === "checkbox-non-USA") {
            $("#checkbox-NV").prop("checked", false);
        }
        let tempFilteredData = vis.preProcessedData;
        vis.filters = [];
        let allCheckBoxes = $(".v2-checkbox-input");
        // get all the checked boxes
        allCheckBoxes.each(i => {
            if (allCheckBoxes[i].checked) {
                vis.filters.push(allCheckBoxes[i].id);
            }
        });
        // console.log("filtered boxes", vis.filters);
        // filter for each box checked
        if (vis.filters.length == 0) {
            vis.filteredData = vis.preProcessedData;
        } else {
            // console.log("filtering on ",vis.filters );
            vis.filters.forEach(f => {
                let filter = v2CheckBoxGuide[f];
                if (filter) {
                    // console.log("start time", new Date(), "filtered data length", tempFilteredData.length);
                    tempFilteredData = tempFilteredData.filter(d => {
                        let result = vis.testCondition(d, filter);
                        return result;
                    });
                    // console.log("end time", new Date(), "filtered data length", tempFilteredData.length);
                }
            })
        }
        vis.filteredData = tempFilteredData;
        // console.log("filtered Data", vis.filteredData.length, vis.filteredData);
        vis.wrangleData();
    }

    testCondition(d, f) {
        let isOk = true;
        switch (f.cond) {
            case "EQ":
                isOk = d[f.attr] === f.value;
                break;
            case "NOT_EQ":
                isOk = d[f.attr] !== f.value;
                break;
            case "GT":
                isOk = parseInt(d[f.attr]) > f.value;
                break;
            case "LT":
                isOk = parseInt(d[f.attr]) < f.value;
                break;
            case "not-child-or-adult":
                isOk = parseInt(d[f.attr]) > 12 && parseInt(d[f.attr]) < 19;
                break;
            default:
                console.log("WARNING, didn't expect condition", f.cond);
                isOk = true; // don't filter
        }
        return isOk;
    }

}