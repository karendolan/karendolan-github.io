/* * * * * * * * * * * * * *
*      class BarVis        *
* * * * * * * * * * * * * */


class BubbleLegend {

    // constructor method to initialize Timeline object
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.displayData = [];

        this.initVis()
    }

    initVis(){

        let vis = this;

        vis.margin = {top: 20, right: 10, bottom: 20, left: 10};
        vis.width = 250
        vis.height = 50

        // console.log(`bar ${vis.parentElement} height ${vis.height} width ${vis.width}`);

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append('g')
            .attr('transform', `translate (${vis.margin.left}, ${vis.margin.top})`);

        vis.svg.append("circle").attr("cx",0).attr("cy",0).attr("r", 6).style("fill", bubbleColors[0])
        vis.svg.append("circle").attr("cx",0).attr("cy",30).attr("r", 6).style("fill", bubbleColors[1])
        vis.svg.append("circle").attr("cx",0).attr("cy",60).attr("r", 6).style("fill", bubbleColors[3])
        vis.svg.append("circle").attr("cx",150).attr("cy",0).attr("r", 6).style("fill", bubbleColors[2])
        vis.svg.append("circle").attr("cx",150).attr("cy",30).attr("r", 6).style("fill", bubbleColors[4])
        vis.svg.append("text").attr("x", 20).attr("y", 0).text("Manual Labor").style("font-size", "15px").attr("alignment-baseline","middle")
        vis.svg.append("text").attr("x", 20).attr("y", 30).text("Housework").style("font-size", "15px").attr("alignment-baseline","middle")
        vis.svg.append("text").attr("x", 20).attr("y", 60).text("Student").style("font-size", "15px").attr("alignment-baseline","middle")
        vis.svg.append("text").attr("x", 170).attr("y", 0).text("No Job").style("font-size", "15px").attr("alignment-baseline","middle")
        vis.svg.append("text").attr("x", 170).attr("y", 30).text("Other").style("font-size", "15px").attr("alignment-baseline","middle")

    }

}