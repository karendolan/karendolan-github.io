/* * * * * * * * * * * * * *
*      class BarVis        *
* * * * * * * * * * * * * */


class BubbleVis {

    // constructor method to initialize Timeline object
    constructor(parentElement, data, sex) {
        this.parentElement = parentElement;
        this.data = data;
        this.displayData = [];
        this.sex = sex;

        // for brush filter
        // this.parseDate = d3.timeParse("%m/%d/%Y");

        // Custom key for state bars
        this.key = function(d) {
            return d["PO Birth"];
        };

        this.initVis()
    }

    initVis(){

        let vis = this;

        vis.margin = {top: 20, right: 30, bottom: 40, left: 80};
        vis.width = 500
        vis.height = 250

        // console.log(`bar ${vis.parentElement} height ${vis.height} width ${vis.width}`);

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append('g')
            .attr('transform', `translate (${vis.margin.left}, ${vis.margin.top})`);

        // Set the color and title
        var bubbleColor = ""
        var titleText = ""
        if (vis.sex == "M"){
            titleText = "Men"
            bubbleColor = "#00585b"
        }
        else{
            titleText = "Women"
            bubbleColor = "#5C0300"
        }

        vis.bubbleGroup = vis.svg.append("g")
            .attr("id","bubbleGroup")

        // add title
        vis.svg.append('g')
            .attr('class', 'title bubble-title')
            .append('text')
            .text(titleText)
            .attr('transform', `translate(${vis.width / 2}, 10)`)
            .attr('text-anchor', 'middle')

        // -- The Scales


        vis.rScale = d3.scaleLinear()
            .range([0,vis.height/4])





        vis.color = d3.scaleLinear()
            .range(["grey", "grey"]);

        vis.textCorner = vis.svg.append('g')
            .attr('class', 'tooltip-text')
            .append('text')
            .attr('transform', `translate(10,10)`)
            .text("Job: ")

        vis.countCorner = vis.svg.append('g')
            .attr('class', 'tooltip-text')
            .append('text')
            .attr('transform', `translate(10,30)`)
            .text("Count: ")




        this.wrangleData();
    }

    wrangleData(){
        let vis = this

        let filteredData = [];

        // reset displayData
        vis.displayData = [];

        // create job-count object
        vis.jobcount = {}

        // find the maximum job count

        // iterate over all rows the csv (dataFill)
        vis.data.forEach( row => {
            // and push rows with proper dates into jobcount
            if (row.Sex == vis.sex){
                if (selectedBubbleCensus.length != 0) {
                    if (selectedBubbleCensus.includes(row.Year.toString())) {
                        vis.jobcount[row.Profession] = (vis.jobcount[row.Profession] || 0) + 1;
                    }
                }
                else{
                    vis.jobcount[row.Profession] = (vis.jobcount[row.Profession] || 0) + 1;
                }

            }
        });

        //set cutoff for minimum job count to display in bubble chart
        vis.maxrad = d3.max(Object.entries(vis.jobcount), d => d[1])
        const cutoff = vis.maxrad*0.01

        //iterate over jobcount and push all rows to display-data
        Object.entries(vis.jobcount).forEach(row => {
            if (row[1] >= cutoff){
                vis.displayData.push({
                    job: row[0],
                    count: row[1]
                })
            }

        })



        vis.displayData.sort((a, b) => b.count - a.count)

       console.log("Bubble data: ", vis.displayData)


        vis.updateVis()

    }

    updateVis(){
        let vis = this;



        vis.rScale.domain([0,vis.maxrad])
        vis.color.domain([0,vis.maxrad])

        var manuallabor = ["miner","laborer","farmer","carpenter","wood chopper","farm laborer","blacksmith","day laborer",
            "farm hand","teamster","servant"]

        var home = ["homemaker","home maker","keeping house","house keeper", "housekeeper", "at home"]

        var blank = ["blank","\\n","none"]

        var student = ["at school","student"]

        try {
            vis.bubbles.remove()
        }
        catch(err) {}
        try {
            vis.label.remove()
        }
        catch(err) {}

        vis.bubbles = vis.bubbleGroup
            .selectAll("circle")
            .data(vis.displayData)
            .enter()
            .append("circle")
            .attr("class","bubble")
            .attr("fill",d => vis.color(d["count"]))
            .attr("fill",function(d,i){
                var jobname = d.job.toLowerCase()
                if(i <= 4){
                    if(manuallabor.includes(jobname)){
                        return bubbleColors[0]
                    }
                    else if(home.includes(jobname)){
                        return bubbleColors[1]
                    }
                    else if(blank.includes(jobname)){
                        return bubbleColors[2]
                    }
                    else if(student.includes(jobname)){
                        return bubbleColors[3]
                    }
                    else {
                        return bubbleColors[4]
                    }
                }

                else {
                    return vis.color(d["count"])
                }
            })
            .attr("opacity",0.85)
            .attr("r", d => vis.rScale(d["count"]))
            .attr("cx",vis.width/2)
            .attr("cy",vis.height/2)
            .on("mouseover", function(event, d) {
                var newword = true;
                var jobname = ""
                //Convert job names to camelcase
                for (let i = 0; i < d.job.length; i++){
                    if (newword){
                        newword = false;
                        jobname += (d.job[i].toUpperCase())
                    }
                    else {
                        if (d.job[i] == " ") {
                            newword = true;
                        }
                        jobname += d.job[i].toLowerCase()
                    }
                }

                vis.textCorner.text("Job: " + jobname)
                vis.countCorner.text("Count: " + d.count)
                d3.select(this).transition()
                    .attr("stroke","black")
                    .attr("stroke-width",3)
                })
            .on("mouseleave", function(event, d) {
                vis.textCorner.text("Job: ")
                vis.countCorner.text("Count: ")
                //console.log(event)
                //console.log(d)
                d3.select(this).transition()
                    .attr("stroke-width",0)
            })
            .call(d3.drag() // call specific function when circle is dragged
                .on("start", function(event,d){
                    if (!event.active) vis.simulation.alphaTarget(.03).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", function(event,d) {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", function(event,d) {
                    if (!event.active) vis.simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                })
            );

        vis.label = vis.bubbleGroup.selectAll(null)
            .data(vis.displayData)
            .enter()
            .append("text")
            .text(function (d,i) {
                if(i<=4){
                    if(vis.rScale(d.count)>=25){
                        var newword = true;
                        var jobname = ""
                        //Convert job names to camelcase
                        for (let i = 0; i < d.job.length; i++){
                            if (newword){
                                newword = false;
                                jobname += (d.job[i].toUpperCase())
                            }
                            else {
                                if (d.job[i] == " ") {
                                    newword = true;
                                }
                                jobname += d.job[i].toLowerCase()
                            }
                        }
                        return jobname;
                    }

                } })
            .attr("alignment-baseline","middle")
            .style("text-anchor", "middle")
            .style("fill", "#1c1c1c")
            .style("font-size", 12)
            .on("mouseover", function(event, d) {
                var newword = true;
                var jobname = ""
                //Convert job names to camelcase
                for (let i = 0; i < d.job.length; i++){
                    if (newword){
                        newword = false;
                        jobname += (d.job[i].toUpperCase())
                    }
                    else {
                        if (d.job[i] == " ") {
                            newword = true;
                        }
                        jobname += d.job[i].toLowerCase()
                    }
                }

                vis.textCorner.text("Job: " + jobname)
                vis.countCorner.text("Count: " + d.count)
            })
            .on("mouseleave", function(event, d) {
                vis.textCorner.text("Job: ")
                vis.countCorner.text("Count: ")
                //console.log(event)
                //console.log(d)
            });

        // Features of the forces applied to the nodes:
        vis.simulation = d3.forceSimulation()
            .force("forceX", d3.forceX().strength(.3).x(vis.width * .5))
            .force("forceY", d3.forceY().strength(.3).y(vis.height * .5 + 10))
            .force("center", d3.forceCenter().x(vis.width / 2).y(vis.height / 2)) // Attraction to the center of the svg area
            .force("charge", d3.forceManyBody().strength(-15)) // Nodes are attracted one each other of value is > 0

        // Apply these forces to the nodes and update their positions.
        // Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
        vis.simulation
            .nodes(vis.displayData)
            .force("collide", d3.forceCollide().strength(0.5).radius(function(d){
                // console.log(d);
                return (vis.rScale(d.count)+3)
            }).iterations(1)) // Force that avoids circle overlapping
            .on("tick", function(d){
                // console.log("tick")
                vis.bubbles
                    .attr("cx", function(d){return d.x; })
                    .attr("cy", function(d){ return d.y; })

                vis.label
                    .attr("x", function(d){return d.x; })
                    .attr("y", function(d){ return d.y; })
            });

        /*
    // Get unfiltered min and max to maintain the color gradient bigger context
    let minValUnfiltered = d3.min(vis.displayData, d => d[selectedCategory]);
    let maxValUnfiltered = d3.max(vis.displayData, d => d[selectedCategory]);
    // update color
    vis.color
        .domain([minValUnfiltered, maxValUnfiltered]);
    console.log("BARS color min and max", minValUnfiltered, maxValUnfiltered);

    // bind new data with a custom key
    let bars = vis.svg.selectAll(".bar")
        .data(vis.topTenData, vis.key);

    // -- Create new bars --
    bars.enter()
        .append("rect")
        .attr("class", d=> `bar ${d.location}`)
        .attr('fill', d => vis.color(d[selectedCategory]))
        .attr("y", d => vis.y(d[selectedCategory]))
        .attr("x", d=> {
            // console.log(`X-Category : ${d.state}, scaled ${vis.x(d.state)}`);
            return vis.x(d.location)
        })
        .attr("width", vis.x.bandwidth())
        .attr("height", d => {
            let val = d[selectedCategory];
            console.log(`Height: ${val}, ${vis.y(val)}, height vis ${vis.height} `);
            return vis.height - vis.y(val) ;
        })
    //    .on('mouseover', function(event, d){
    //        // Connect to map graph
    //        d3.selectAll(`.${d.location}`)
    //            .attr('fill', 'red');
    //        tooltip
    //            .style("opacity", 1)
    //            .style("left", event.pageX - 250 + "px")
    //            .style("top", event.pageY - 200 + "px")
    //            .html(`
    // <div class="toolTipText" >
    //     <h3>${d.state}</h3>
    //     <div> Population: ${d.population.toLocaleString('en')}</div>
    //     <div> Cases (absolute): ${d.absCases.toLocaleString('en')}</div>
    //     <div> Deaths (absolute): ${d.absDeaths.toLocaleString('en')}</div>
    //     <div> Cases (relative): ${d.relCases.toFixed(2)}%</div>
    //     <div> Deaths (relative): ${d.relDeaths.toFixed(2)}%</div>
    // </div>`);
    //
    //    })
    //    .on('mouseout', function(event, d) {
    //        return vis.unHighlight(event, d, vis, this);
    //    })
    //    // -- Update bars --
    //    .merge(bars)
    //    .interrupt() // interrupt the active transition
    //    .transition()
    //    .duration(200)
    //    .attr('fill', d => vis.color(d[selectedCategory]))
    //    .attr("y", d => vis.y(d[selectedCategory]))
    //    .attr("x", d=> {
    //        // console.log(`X-Category : ${d.state}, scaled ${vis.x(d.state)}`);
    //        return vis.x(d.state)
    //    })
    //    .attr("width", vis.x.bandwidth())
    //    .attr("height", d => {
    //        // let val = d[selectedCategory];
    //        // console.log(`Height: ${val}, ${vis.y(val)}, height vis ${vis.height} `);
    //        return vis.height - vis.y(d[selectedCategory]);
    //    });

    // -- Remove bars --
    bars.exit()
        .transition()
        .duration(500)
        .remove();

    // Update the axis
    //Update x-axis
    let xElem = vis.svg.select(".x.axis")
        .transition()
        .duration(500)
        .call(vis.xAxis)
        .selectAll("text")
        .attr("transform", "rotate(14)")
        .style("text-anchor", "start");

    //Update y-axis
    vis.svg.select(".y.axis")
        .transition()
        .duration(500)
        .call(vis.yAxis);
         */
    }



}