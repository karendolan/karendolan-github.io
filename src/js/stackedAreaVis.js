
class StackedAreaVis {

    // constructor method to initialize Timeline object
    constructor(parentElement, data, quality) {
        this.parentElement = parentElement;
        this.data = data;
        this.norm = "abs"
        this.quality = quality
        this.displayData = [];
        this.descending = true;
        this.years = ['1860', '1870', '1880', '1900', '1910', '1920']
        this.colorScale = d3.scaleOrdinal()
            .domain(["F", "M", 'B', 'C', 'I', 'J', 'W', 'N', 'Im'])
            .range(["#3E70E6", "#86F54E", "#F2A56D", "green", "#70F5F4", "yellow", "#BD73E6", "#FC727F", "#728BFC"]);
        // this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        // .domain(this.years)
        // .range(["pink", "lightblue"]);


        this.initVis()
    }

    initVis(){
        let vis = this;
        switch (vis.quality){
            case 'Sex':
                vis.categories = ['F', 'M']
                vis.catMap = {'F': 'Women', 'M': 'Men'}
                break;
            case 'Color':
                vis.categories = ['B', 'C', 'I', 'J', 'M', 'W']
                vis.catMap = {'B': 'Black', 'C': 'Chinese', 'I': 'Native American', 'J': 'Japanese',
                    'M': 'Mexican', 'W': 'White'}
                break;
            case 'PO Birth':
                vis.categories = ['N', 'Im']
                vis.catMap = {'Im': 'Immigrant', 'N': 'Nevadan'}
                break;
        }

        // console.log(vis.data)
        // console.log("init vis")
        vis.margin = {top: 40, right:230, bottom: 60, left: 80};

        vis.width = 500
        vis.height = 250

        // SVG drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");


        vis.titleText = vis.svg.append("text")
            .attr("x", (vis.width / 2))
            .attr("y", 0 - (vis.margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("text-decoration", "underline")

        // Overlay with path clipping
        vis.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height);

        // Scales and axes
        vis.x = d3.scaleTime()
            .range([0, vis.width])
            .domain(d3.extent(vis.data, d=> new Date(parseInt(d.Year),0)));

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.xAxis = d3.axisBottom()
            .scale(vis.x)
            .tickFormat(d3.timeFormat("%Y")); ;

        vis.yAxis = d3.axisLeft()
            .scale(vis.y);

        vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", "translate(0," + vis.height + ")");

        vis.svg.append("g")
            .attr("class", "y-axis axis");

        vis.yLab = vis.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - vis.margin.left)
            .attr("x", 0 - (vis.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Value");

        vis.xLab = vis.svg.append("text")
            .attr("transform",
                "translate(" + (vis.width/2) + " ," +
                (vis.height + vis.margin.top) + ")")
            .style("text-anchor", "middle")
            .text("Date");





        vis.wrangleData();
    }

    wrangleData(norm) {
        let vis = this
        if(norm){
            vis.norm = norm
        }


        // first, filter according to selectedTimeRange, init empty array
        let filteredData = [];

        // reset displayData
        vis.displayData = [];

        // iterate over all rows the csv (dataFill)
        //filteredData = vis.data;
        // prepare covid data by grouping all rows by pob
        let dataByYear = d3.group(vis.data, d => d["Year"])
        //  console.log(dataByYear)


        let cumulCat = []
        for (var yearMap of dataByYear) {
            cumulCat.push([yearMap[0], d3.group(yearMap[1], d => d[vis.quality])])
        }


        // console.log("categories")
        // console.log(cumulCat)

        vis.filteredData = []
        for (var year of cumulCat) {

            let yearDet = {}
            let normedSum = 0
            if (vis.quality == 'PO Birth'){
                yearDet['N'] = 0
                yearDet['Im'] = 0
                for(var cat of year[1]){
                    let yearCount = cat[1].length
                    normedSum += yearCount

                    if (cat[0] == "NV"){
                        yearDet['N'] += yearCount
                    }
                    else{
                        yearDet['Im'] += yearCount
                    }
                }
            }
            else{
                for (var cat of vis.categories){
                    if(year[1].has(cat)){
                        yearDet[cat] = year[1].get(cat).length
                        normedSum += year[1].get(cat).length
                    }

                    else{
                        yearDet[cat] = 0
                    }
                }
            }


            if(vis.norm == "rat"){
                for (var cat in yearDet){
                    yearDet[cat] = yearDet[cat]/normedSum
                }

            }

            yearDet.Year = new Date(year[0],0)
            yearDet.Tot = normedSum
            vis.filteredData.push(yearDet)
        }
        // console.log(vis.filteredData)

        vis.filteredData.sort((a, b) => (a.Year - b.Year))
        let stack = d3.stack()
            .keys(vis.categories);

        vis.stackedData = stack(vis.filteredData)

        console.log("filtered: ")
        console.log(vis.filteredData)
        vis.area = d3.area()
            .x(d=> vis.x(d.data.Year))
            .y0(d=> vis.y(d[0]))
            .y1(d=> vis.y(d[1]))



        vis.updateVis()

    }

    updateVis() {
        let vis = this;
        // Update domain
        // Get the maximum of the multi-dimensional array or in other words, get the highest peak of the uppermost layer
        vis.y.domain([0, d3.max(vis.stackedData, function (d) {
            return d3.max(d, function (e) {
                return e[1];
            });
        })
        ]);
        // Draw the layers
        vis.SAC = vis.svg.selectAll(".area")
            .data(vis.stackedData);

        vis.title = vis.parentElement + " over Time"
        if (vis.norm == "rat"){
            vis.titleText += ", Ratio"
            vis.yLabText = "Population Distribution"
        }
        else{
            vis.titleText += ", Absolute"
            vis.yLabText = "Population"
        }

        vis.xLab.text("Census Date")
        vis.yLab.text(vis.yLabText)


        vis.SAC.enter().append("path")
            .merge(vis.SAC)
            .attr("class", "area")
            .style("fill", d => {
                return vis.colorScale(d.key)
            })
            .on("mouseover", (d, i) => {
                vis.filter = i.key;
            })
            .transition()
            .duration(2500)
            .attr("d", d => vis.area(d))



        vis.SAC.exit().remove();

        vis.tooltipGroup = vis.svg.append("g")

        vis.padding = 10
        vis.tooltipGroup.append("line")
            .attr("x1", 0)
            .attr("y1", vis.padding)
            .attr("x2", 0)
            .attr("y2", vis.height - vis.padding)
            .attr("class", "tooltip-group")
            .attr("stroke", "black")

        vis.tooltipGroup.append("text")
            .attr("class", "tooltip-group")
            .attr("id", "tooltip-date")
            .attr("x", 10)
            .attr("y", 30)


        vis.tooltipGroup.exit().remove();


        let i =0

        for (var cat in vis.filteredData[0]){
            if (cat != "Year"){
                vis.tooltipGroup.append("text")
                    .attr("class", "tooltip-group")
                    .attr("id", "cat-" + cat)
                    .attr("x", 10)
                    .attr("y", 50 + 20 * i)
                i += 1
            }

        }


        vis.svg.append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr("opacity", "0")
            .on("mouseover", function (d, i){
                vis.tooltipGroup
                    .style("display", "block")
            })
            .on("mouseout", function (d, i){
                // vis.tooltipGroup
                //     .style("display", "none")
            })
            .on('mousemove', function (event, d) {
                vis.mousemove(event, vis, d);
            })

        // TO-DO (Activity IV): update tooltip text on hover




        // Call axis functions with the new domain
        vis.svg.select(".x-axis").call(vis.xAxis);
        vis.svg.select(".y-axis").call(vis.yAxis);

        vis.legend = vis.svg.selectAll("mydots")
            .data([...vis.categories].reverse())
            .enter()
            .append("circle")
            .attr("cx", vis.width + 15)
            .attr("cy", function(d,i){ return 100 + i*18}) // 100 is where the first dot appears. 25 is the distance between dots
            .attr("r", 5)
            .style("fill", function(d){
                return vis.colorScale(d)})

        vis.legend.exit().remove()

        vis.labels = vis.svg.selectAll("mylabels")
            .data([...vis.categories].reverse())
            .enter()
            .append("text")
            .attr("x", vis.width + 25)
            .attr("y", function(d,i){ return 100 + i*18}) // 100 is where the first dot appears. 25 is the distance between dots
            //.style("fill", function(d){ return vis.colorScale(d)})
            .text(function(d){ return vis.catMap[d]})
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")

        vis.labels.exit().remove()

    }

    mousemove(event, vis){
        let timeScaleRef = d3.scaleTime()
            .domain([vis.padding, vis.width])
            .range([new Date(1860, 0), new Date(1920, 0)])
        let xPos = d3.pointer(event)[0]
        let bisectDate = d3.bisector(d=>d.Year).left;

        let index = bisectDate(vis.filteredData, timeScaleRef(xPos))


        let i = 0
        for (var cat in vis.filteredData[index]){
            if (cat != "Year" && cat != 'Tot') {
                let catVal = vis.filteredData[index][cat]
                vis.svg.select("#cat-" + cat)
                    .text(vis.catMap[cat]+ ": " + Math.round(catVal * 10000) / 10000 )
                    .attr("transform", "translate(" + Math.min(xPos, 330) + ", 0)")
                    .attr("font-size", "15px")
                i += 1
            }

        }

        vis.svg.select("#tooltip-population")
            .text("population: ")
            .attr("transform", "translate(" + Math.min(xPos, 330) + ", 0)")
        vis.svg.select(".tooltip-group")
            .attr("transform", "translate(" + xPos + ", 0)")
        vis.svg.select("#tooltip-date")
            .text("Census Year: " + (vis.filteredData[index]['Year'].getYear() + 1900).toString())
            .attr("transform", "translate(" + Math.min(xPos, 330) + ", 0)")
            .attr("font-size", "20px")

    }
}