/* * * * * * * * * * * * * *
*      class BarVis        *
* * * * * * * * * * * * * */


class BarVis {

    // constructor method to initialize Timeline object
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.displayData = [];

        // Custom key for bars
        this.key = function(d) {
            return d.location;
        };

        this.initVis()
    }

    initVis(){

        let vis = this;

        //vis.margin = {top: 20, right: 30, bottom: 40, left: 80};
        //vis.width = 500
        //vis.height = 250

        vis.margin = {top: 20, right: 60, bottom: 60, left: 80};
        vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right;
        vis.height = $("#" + vis.parentElement).height() - vis.margin.top - vis.margin.bottom;


        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append('g')
            .attr('transform', `translate (${vis.margin.left}, ${vis.margin.top})`);

        // add title
        // Moved title to be above svg area
        /*
        vis.barLabelGroup = vis.svg.append('g')
            .attr('class', 'title bar-title');

        vis.barLabel = vis.barLabelGroup
            .append('text')
            .text(`${vis.descending ? 'Top Ten' : 'Bottom Ten'} `)
            .attr('transform', `translate(${vis.width / 2}, 10)`)
            .attr('text-anchor', 'middle')
         */

        // -- add bars group
        vis.barGroup = vis.svg.append('g')
            .attr('class', 'bar-group');

        // -- The Scales
        vis.x = d3.scaleBand()
            .rangeRound([0, vis.width], 0.05)
            .paddingInner(0.1);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        // -- The AXIS
        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

        vis.yAxis = d3.axisLeft()
            .ticks(5)
            .scale(vis.y);

        // Add x-axis
        vis.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0, ${vis.height})`)
            .call(vis.xAxis);

        // Add y-axis
        vis.svg.append("g")
            .attr("class", "y axis")
            .call(vis.yAxis)

        this.wrangleData();
    }

    wrangleData(){
        let vis = this

        // first, filter according to selectedTimeRange, init empty array
        let filteredData = [];

        // reset displayData
        vis.displayData = [];

        // Filter data for time range and if state only
        vis.data.forEach((d) => {
            // filter out unwanted years
            if (lowDate <= d.year && highDate >= d.year) {
                // people born in foreign countries don't have a statePob value
                if (d[placeView]) {
                    filteredData.push(d);
                }
            }
        });

        // Group on state or country preference
        let placeGroup = d3.group(filteredData, d => d[placeView]);
        let placeTotals = Array.from((placeGroup),
            ([key, array]) => ({key: key, value: array.length})
        );

        placeTotals.forEach(t => {
            vis.displayData.push({
                "location": t.key,
                "count": t.value
            })
        })

        vis.displayData.sort((a, b) => b.count - a.count)
        vis.topTenData = vis.displayData.slice(0, 10)

        vis.updateVis()

    }

    updateVis(){
        let vis = this;

        // Get the top ten min and max
        selectedCategory = "count"
        let minVal = d3.min(vis.topTenData, d => d[selectedCategory]);
        let maxVal = d3.max(vis.topTenData, d => d[selectedCategory]);

        console.log("min max", minVal, maxVal);

        // update scales
        vis.x.domain(vis.topTenData.map(d => d.location));
        vis.y.domain([0, maxVal]);

        // update bar label text
        let labelText = lowDate === highDate ? lowDate : `${lowDate}-${highDate}`
        d3.select("#barChartDivLabel").text(`Nevada Census ${labelText} Top 10 Places of Birth`);

        // bind new data with a custom key
        vis.bars = vis.barGroup.selectAll(".fill.bar")
            .data(vis.topTenData, vis.key);

        console.log("vis.topTenData", vis.topTenData);

        // -- Remove bars --
        vis.bars.exit()
            .transition()
            .duration(500)
            .remove();

        // -- Create new bars --
        vis.bars.enter()
            .append("rect")
            .attr("class", d=> `fill bar placePob ${d.location} ${getPlaceClassId()} ${getPlaceClassId(d.location)}`)
            .attr('fill', d => hookColorLinear(d[selectedCategory]))
            .attr("y", d => vis.y(d[selectedCategory]))
            .attr("x", d=> {
                return vis.x(d.location)
            })
            .attr("width", vis.x.bandwidth())
            .attr("height", d => {
                let val = d[selectedCategory];
                // console.log(`Height: ${val}, ${vis.y(val)}, height vis ${vis.height} `);
                return vis.height - vis.y(val) ;
            })
             .on('mouseover', function(event, d){
                 // Connect to map graph
                 d3.selectAll(`.fill.${getPlaceClassId(d.location)}`)
                     .attr('fill', 'black');
             })
             .on('mouseout', function(event, d) {
                 // Connect to map graph
                 let count = d.count;
                 d3.selectAll(`.fill.${getPlaceClassId(d.location)}`)
                     .attr('fill', hookColorLinear(d[selectedCategory]))
             })

        // -- Update bars --
        vis.bars.merge(vis.bars)
             //.interrupt() // interrupt the active transition
             .transition()
             .duration(200)
             .attr('fill', d => hookColorLinear(d[selectedCategory]))
             .attr("y", d => vis.y(d[selectedCategory]))
             .attr("x", d=> {// console.log(`X-Category : ${d.state}, scaled ${vis.x(d.state)}`);
                return vis.x(d.location)
             })
             .attr("width", vis.x.bandwidth())
             .attr("height", d => {
                 // let val = d[selectedCategory];
                 // console.log(`Height: ${val}, ${vis.y(val)}, height vis ${vis.height} `);
                 return vis.height - vis.y(d[selectedCategory])
             });

        // Update the axis
        //Update x-axis
        let xElem = vis.svg.select(".x.axis")
            .transition()
            .duration(500)
            .call(vis.xAxis)
            .selectAll("text")
            .attr("transform", "rotate(25)")
            .style("text-anchor", "start");

        //Update y-axis
        vis.svg.select(".y.axis")
            .transition()
            .duration(500)
            .call(vis.yAxis);

    }

    unHighlight(event, d, vis, item) {
        let color = hookColorLinear(d[selectedCategory]);
        // Connect to map graph
        d3.selectAll(`.fill.${d.state}`)
            .attr('fill', color)
        tooltip
            .style("opacity", 0)
            .style("left", 0)
            .style("top", 0)
            .html(``);
    }

}