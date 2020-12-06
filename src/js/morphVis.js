/* * * * * * * * * * * * * * * * * *
 *      RisingInsightMorphVis       *
 * * * * * * * * * * * * * * * * * */

// helper to sum the count in the array
const sumArrayReducer = (accumulator, currentValue) => accumulator + currentValue;

// A guide on how to filter by checkbox selection
const checkBoxGuide = {
    "checkbox-gender-female": {attr: "Sex", value: "F", cond: "EQ"},
    "checkbox-gender-male": {attr: "Sex", value: "M", cond: "EQ"},
    "checkbox-age-adult": {attr: "Age", value: "18", cond: "GT"},
    "checkbox-age-child": {attr: "Age", value: "13", cond: "LT"},
    // special case
    "checkbox-age-teen": {attr: "Age", value: "", cond: "not-child-or-adult"},
    "checkbox-NV": {attr: "statePob", value: "NV", cond: "EQ"},
    "checkbox-non-NV": {attr: "statePob", value: "NV", cond: "NOT_EQ"},
    "checkbox-USA": {attr: "countryPob", value: "United States of America", cond: "EQ"},
    "checkbox-non-USA": {attr: "countryPob", value: "United States of America", cond: "NOT_EQ"},
    "checkbox-white": {attr: "Color", value: "W", cond: "EQ"},
    "checkbox-non-white": {attr: "Color", value: "W", cond: "NOT_EQ"}
};
// the class on all the above input checkbox elements
const checkBoxClass = "v2-checkbox-input";

class RisingInsightVis {

    // constructor method to initialize RisingInsightGridVis object
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
        //console.log(vis.data)
        //console.log("init vis")

        // stealing the mapvis tool tip
        vis.tooltip = d3.select("#mapTooltip");

        vis.color = d3.scaleOrdinal()
            // Adobe Color Analogous
            .range(["#F7DC28", "#D9AE23", "#D98A23", "#F77E28", "#F0B132"])

        vis.margin = {top: 20, right: 20, bottom: 20, left: 40};
        vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right;
        vis.height = $("#" + vis.parentElement).height() - vis.margin.top - vis.margin.bottom;
        vis.buffer = 20;

        // Scale the cells on the smaller height or width of the SVG
        let cellScaler = vis.height > vis.width ? vis.width: vis.height;

        vis.cellHeight = cellScaler / 15;
        vis.cellWidth = vis.cellHeight;
        vis.cellPadding = vis.cellHeight / 4; // padding is smaller the cell height-width

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr('transform', `translate (0, ${vis.margin.top})`);

        // group around the grid
        vis.cellGroup = vis.svg.append("g")
            .attr("class", "grid-container")
            // move to right to give room to legend
            .attr("transform", `translate(${vis.width/3}, ${vis.buffer})`);

        // add legend
        vis.legend = vis.svg.append('g')
            .attr('class', 'legend');

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
        console.log("pidGrouping", vis.preProcessedData);
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
            .key(d => {
                if (d.censusCount === undefined) {
                    console.log("KAREN warning ",d)
                }
                return d.censusCount
            })
            .entries(vis.filteredData);

        // set color domain to number of years from census
        vis.color
            .domain(vis.censusCountGroup.map(d => d.key))

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
        // penalize the census 1 group for count to add to 100
        // iterate backwards over the array
        let evenCount = 100;
        for (let i = percentages.length - 1 ; i > 0 ; i--) {
            evenCount = evenCount - percentages[i];
        }
        //console.log("percentages before ", percentages);
        percentages[0] = evenCount;
        //console.log("percentages after", percentages);
        // [92, 6, 1, 1]
        // ---- end penalize ---

        // Generalize the attributes of the percent who stayed and percent who left
        let tempData = [];
        vis.legendData = []
        let i = 0;
        // Make 100 data entries
        percentages.forEach((percent,i) => {
            for (let j = percent; j > 0 ; j--) {
                // push identical objects to match percentage count
                tempData.push({
                    censusCount: vis.censusCountGroup[i].key,
                    censusPercent: percent,
                    // entries: vis.censusCountGroup[i].value, // maybe make this a lookup?
                })
            }
        });
        // special data for legend
        percentages.forEach((p,i) => {
            vis.legendData.push({
                censusCount: vis.censusCountGroup[i].key,
                censusPercent: p,
                entryCount: vis.censusCountGroup[i].values.length
            })
        });

        vis.insights = [];
        // vis.insightList = ['pobMap', 'genderMap', 'ageMap', 'jobMap', 'censusMap', 'colorMap', 'countyMap' ];

        // mine attributes
        vis.censusCountGroup.forEach(g => {
            let key = g.key;
            vis.insights[key] = {
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
        vis.displayData = tempData;
        vis.updateVis();
    }

    // Update the visualization
    updateVis() {
        let vis = this;
        let dataIndex = 0;
        // Create a 10 x 10 grid

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
                let x0 = Math.floor(i / 100) % 10;
                let x1 = Math.floor(i % 10);
                return vis.cellPadding * x0 + (vis.cellPadding + vis.cellWidth) * (x1 + x0 * 10);
            })
            .attr("y", (d,i) => {
                let y0 = Math.floor(i / 1000);
                let y1 = Math.floor(i % 100 / 10);
                return vis.cellPadding * y0 + (vis.cellPadding + vis.cellWidth) * (y1 + y0 * 10);
            })
            .attr("width", vis.cellWidth)
            .attr("height", vis.cellWidth)
            .attr("fill", d=> vis.color(d.censusCount))


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
            .attr("y", (d,i) => vis.buffer + i * 30)
            .attr("width", vis.cellWidth - vis.cellPadding)
            .attr("height", vis.cellWidth - vis.cellPadding)
            .attr("fill", d=> vis.color(d.censusCount))



        // Add one dot in the legend for each name.
        vis.dotLabels = vis.legend.selectAll(".legend-label")
            .data(vis.legendData);

        //exit, remove
        vis.dotLabels.exit().remove();

        // enter
        vis.dotLabels.enter()
            .append("text")
            .attr("class", "legend-label census-matrix-legend-text")
            .attr("x", 32) // same for all to offset from dot/square
            .attr("y", (d, i) => 10 + vis.buffer + i * 30)
            .style("fill", "black")
            .text(d => {
                return ` ${d.censusPercent}% appear in ${d.censusCount} census`;
            })
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")

        // merge
        vis.dotLabels.merge(vis.dotLabels)
            .attr("y", (d, i) => vis.buffer + i * 35)
            .style("fill", "black")
            .text(d => {
                return ` ${d.censusPercent}% appear in ${d.censusCount} census`;
            });

        // update descriptive text
        vis.updateDescriptiveText();

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

    // Update insight text
    updateDescriptiveText(){
        let vis = this;
        let html = "<div class='v2-updated-text'>";
        vis.insights.forEach((c, i) => {
            // sort each attribute by number of occurrences in that census count
            // Largest at top and smallest at end
            // console.log("before", c);
            for (const category in c) {
                //c[category].forEach((v, k) => console.log(k,v))
                let greatest = d3.greatest(c[category], (a, b) => d3.ascending(a[1], b[1]));
                let least = d3.least(c[category], (a, b) => d3.ascending(a[1], b[1]));
                // console.log(category, greatest, least);
            }

            let topPob = d3.greatest(c.pobMap, (a, b) => d3.ascending(a[1], b[1]));
            let topAgeGroup = d3.greatest(c.ageMap, (a, b) => d3.ascending(a[1], b[1]));
            let topCensus = d3.greatest(c.censusMap, (a, b) => d3.ascending(a[1], b[1]));
            let topGender = d3.greatest(c.genderMap, (a, b) => d3.ascending(a[1], b[1]));
            let topColor = d3.greatest(c.colorMap, (a, b) => d3.ascending(a[1], b[1]));
            let topJob = d3.greatest(c.jobMap, (a, b) => d3.ascending(a[1], b[1]));
            let topCounty = d3.greatest(c.countyMap, (a, b) => d3.ascending(a[1], b[1]));

            html +=`<h4 class="v2-title-${topPob[0]}">Most likely attributes when appearing in ${i} census...</h4>`;
            html +=`<div class="v2-${topPob[0]}">Born in ${topPob[0]}</div>`;
            html +=`<div class="v2-${topAgeGroup[0]}">${topAgeGroup[0]} years old in first census</div>`;
            html +=`<div class="v2-${topCensus[0]}">First appear in the ${topCensus[0]} census</div>`;
            html +=`<div class="v2-${topGender[0]}">Are ${topGender[0]} %XYZ</div>`;
            html +=`<div class="v2-${topColor[0]}">To be of "color:${topColor[0]} percent (${topCounty[1].toLocaleString('en')})"</div>`;
            html +=`<div class="v2-${topCounty[0]}">To live in ${topCounty[0]}, Nevada (${topCounty[1].toLocaleString('en')})</div>`;
        })
        html += "</div>";
        d3.selectAll(".v2-description-text").html(html);
    }

    // Mouse over event of place
    //TODO not using this tool tip anymore
    handleMouseOver (vis, event, d) {
        //Connecting map and bar graph states
        let topPob = d3.greatest(vis.insights[d.censusCount].pobMap, (a, b) => d3.ascending(a[1], b[1]));
        let topAgeGroup = d3.greatest(vis.insights[d.censusCount].ageMap, (a, b) => d3.ascending(a[1], b[1]));
        let topCensus = d3.greatest(vis.insights[d.censusCount].censusMap, (a, b) => d3.ascending(a[1], b[1]));
        };

    // Mouse out event of place
    handleMouseOut(vis, event, d) {
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
        if( $("#checkbox-NV:checked").length > 0) {
            $("#checkbox-USA").prop("checked", false);
            $("#checkbox-non-USA").prop("checked", false);
            $("#checkbox-non-USA").prop("disabled", true);
        } else {
            $("#checkbox-non-USA").prop("disabled", false);
        }

        let tempFilteredData = vis.preProcessedData;
        let filters = [];
        let allCheckBoxes = $(".v2-checkbox-input");
        // get all the checked boxes
        allCheckBoxes.each(i => {
            if (allCheckBoxes[i].checked) {
                filters.push(allCheckBoxes[i].id);
            }
        });
        console.log("filtered boxes", filters);
        // filter for each box checked
        if (filters.length == 0) {
            vis.filteredData = vis.preProcessedData;
        } else {
            console.log("KAREN filtering on ",filters );
            filters.forEach(f => {
                let filter = checkBoxGuide[f];
                if (filter) {
                    console.log("start time", new Date(), "filtered data length", tempFilteredData.length);
                    tempFilteredData = tempFilteredData.filter(d => {
                        let result = vis.testCondition(d, filter);
                        return result;
                    });
                    console.log("end time", new Date(), "filtered data length", tempFilteredData.length);
                }
            })
        }
        vis.filteredData = tempFilteredData;
        console.log(vis.filteredData.length, vis.filteredData);
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
                break;
                isOk = parseInt(d[f.attr]) > 12 && parseInt(d[f.attr]) < 19;
                break;
            default:
                console.log("WARNING, didn't expect condition", f.cond);
                isOk = true; // don't filter
        }
        return isOk;
    }

}