/* * * * * * * * * * * * * *
*          MapVis          *
* * * * * * * * * * * * * */


class MapVis {

    // constructor method to initialize object
    constructor(parentElement, censusData, usaGeoData, worldGeoData) {
        this.parentElement = parentElement;
        this.usaGeoData = usaGeoData;
        this.worldGeoData = worldGeoData;
        this.censusData = censusData;
        // Data with the exclusion for Native USA or Nevada
        this.filteredIncludeData = [];
        this.displayData = [];

        // parse date method
        this.parseDate = d3.timeParse("%m/%d/%Y");
        this.intFormat = d3.format(",");
        this.floatFormat = d3.format(",.2");

        this.initVis()
    }

    initVis() {
        let vis =  this;
        vis.margin = {top: 10, right: 10, bottom: 10, left: 10};
        vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right;
        vis.height = $("#" + vis.parentElement).height() - vis.margin.top - vis.margin.bottom;

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr('transform', `translate (${vis.margin.left}, ${vis.margin.top})`);


        vis.viewpoint = {'width': 975, 'height': 610};

        // adjust map position
        vis.map = vis.svg.append("g") // group will contain global paths
            .attr("class", "map")

        // append tooltip
        vis.tooltip = d3.select("body").append('div')
            .attr('class', "tooltip")
            .attr('id', 'mapTooltip')

        // -------------------------------------------------------------
        // Create the projection, with Gingery sphere with lobes
        vis.projection = d3.geoEckert3() //.geoBaker() //.geoGingery().lobes(8)
            .translate([vis.width / 2, vis.height / 2]);

        // Define a geo generator and pass projection to it
        vis.path = d3.geoPath()
            .projection(vis.projection);

        // Create a sphere clipPath to clip country paths
        // ref clip to sphere https://gist.github.com/mbostock/4463237
        vis.defs = vis.svg.append("defs");
        vis.defs.append("clipPath")
            .attr("id", "map-clip")
            .append("use")
            .attr("xlink:href", "#geo-sphere");

        // Add blue sphere water
        vis.map.append("path")
            .datum({type: "Sphere"})
            .attr("class", "map-sphere")
            .attr("id", "geo-sphere")
            .attr('fill', '#ADDEFF')
            .attr("stroke","rgba(129,129,129,0.35)")
            .attr("d", vis.path);

        // Convert TopoJSON into GeoJSON data structure
        // console.log("TOPO", vis.worldGeoData.objects.countries);
        vis.world = topojson.feature(vis.worldGeoData, vis.worldGeoData.objects.countries).features;
        vis.usaStates = topojson.feature(vis.usaGeoData, vis.usaGeoData.objects.states).features;

        // console.log("TOPO world", vis.world.map(w => w.properties.name));
        // console.log("TOPO states", vis.usaStates.map(s => s.properties.name));

        // Add world countries (this takes a while)
        vis.countries = vis.map.selectAll(".world-country")
            .data(vis.world)
            .enter()
            .append("path")
            //Connect map and bar graph states by adding country name to class
            .attr('class', (d)=> {
                // console.log(d);
                return `fill place placePob world-country ${d.properties.name} ${getPlaceClassId()} ${getPlaceClassId(d.properties.name, 'countryPob')}`
            })
            // clip to sphere
            .attr("clip-path", "url(#map-clip)")
            .attr("d", vis.path)
            .attr("fill", (d,i) => "white")
            .attr('stroke-width', '0.5px')
            .attr('stroke', 'black');

        // Add USA states
        vis.states = vis.map.selectAll(".us-state")
            .data(vis.usaStates)
            .enter()
            .append("path")
            //Connect map and bar graph states by adding state name to class
            .attr('class', (d)=> {
                return `fill place placePob us-state ${d.properties.name} ${getPlaceClassId()} ${getPlaceClassId(d.properties.name, 'statePob')}`;
            })
            // Clip states to sphere
            .attr("clip-path", "url(#clip)")
            .attr("d", vis.path)
            .attr("fill", 'white')
            .attr('stroke-width', '0.5px')
            .attr('stroke', 'black');

        // wrangleData
        vis.wrangleData()
    }

    wrangleData() {
        let vis =  this;

        // Two filter options:
        //  placeView: [countryPob|statePob]
        //  census year range from-to
        // Filter according to selectedTimeRange, init empty array
        let filteredData = [];

        // Filter data for time range and if state only
        vis.censusData.forEach((d) => {
            // filter out unwanted years
            if (lowDate <= d.year && highDate >= d.year) {
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

        // Sort by highest total
        placeTotals.sort((a,b) => {
            return (b.value - a.value);
        });

        vis.placeMap = {};
        vis.casesCountArray = [];
        // Construct place data objects
        placeTotals.forEach((t) => {
            let c = placeGroup.get(t.key);
            // init counters
            let count = 0;
            let men = 0;
            let women = 0;
            let teens = 0;
            let children = 0;
            // calculate new cases by summing up all the entries for each place entry
            c.forEach(entry => {
                // console.log('place ', entry);
                if (entry['Age'] <= 12) {
                    children++;
                } else if (entry['Age'] <= 20) {
                    teens++;
                } else if (entry['Sex'] === 'M') {
                    men++;
                } else if (entry['Sex'] === 'F') {
                    women++;
                }
                count++;
            });

            vis.placeMap[normalizeName(t.key)] = {
                name: t.key,
                men: men,
                women: women,
                teens: teens,
                children: children,
                count: count,
                total: t.value
            }
            // for the min and max count size of the filtered data set
            vis.casesCountArray.push(t.value);
        });
        // console.log("placeMap", vis.placeMap);
        vis.updateVis()

    }

    // Update with the wrangled data
    updateVis() {
        let vis =  this;

        // update color domain, max must not go below 1 for 0 values to stay white.
        let max = d3.max(vis.casesCountArray) || 0.001;
        let min = d3.min(vis.casesCountArray) || 0.001;

        // zoom into US, if states, zoom out to globe, if country
        let scaleK = 1;
        let scaleX = vis.margin.left;
        let scaleY = vis.margin.top;
        if (placeView === 'statePob') {
            scaleK = 4;
            scaleX = -vis.width/3;
            scaleY = -vis.height/2 + 40;
            $(".us-state").css("stroke", "black");
            $(".world-country").css("stroke", "none");
        } else if (placeView === 'countryPob') {
            $(".us-state").css("stroke", "none");
            $(".world-country").css("stroke", "black");
        }
        vis.map.transition()
            .duration(500)
            .attr("transform", "translate(" + scaleX + "," + scaleY + ")scale(" + scaleK + ")");

        // update state fill
        vis.states
            .attr('fill', (d) => {
                return vis.fillColor(d, vis)
            })

        // update country fill
        vis.countries
            .attr('fill', (d) => {
                return vis.fillColor(d, vis)
            })

        // Update title
        let yearText = lowDate === highDate ? lowDate : `${lowDate}-${highDate}`
        d3.select("#mapDivLabel").text(`Nevada Census ${yearText} Place of Birth`);
    }

    // Color the place
    fillColor = function(d, vis) {
        let name = d.location || d.properties.name;
        let normName = normalizeName(name);
        if (!!vis.placeMap[normName]) {
            let colorName = vis.placeMap[normName].name;
            if (hookColor.domain().includes(colorName)) {
                let color = hookColor(name);
                return hookColor(name);
            }
        }
        return 'white';
    }

    // Helper to get the current Nevada census count of the place
    getCount(vis, name) {
        let thisPlaceMap = vis.placeMap[name];
        if (!!thisPlaceMap) {
            return thisPlaceMap.count;
        }
        else return 0;
    }

    // Mouse over event of place
    handleMouseOver =  function(vis, name) {
        //Connecting map and bar graph states
        let tHeight = 100;
        let tWidth = 120;
        let thisPlaceMap = vis.placeMap[name];
        if (!!thisPlaceMap) {
            // find the position of the related map item
            let mapEl =  $(`.place.${getPlaceClassId(name)}`);
            if (mapEl.length > 0) {
                tHeight = $(mapEl).offset().top + 20;
                tWidth =  $(mapEl).offset().left + 100;
            }
            let yearText = lowDate === highDate ? lowDate : `${lowDate}-${highDate}`
            $("#timeLinedetailDiv").html(`
                    <div class="toolTipTextMap" >
                        <div>From ${thisPlaceMap.name} in ${yearText} (${thisPlaceMap.count.toLocaleString('en')})</div>
                        <div> Men: ${thisPlaceMap.men.toLocaleString('en')   }</div> 
                        <div> Women: ${thisPlaceMap.women.toLocaleString('en')   }</div>   
                        <div> Teens: ${thisPlaceMap.teens.toLocaleString('en')   }</div> 
                        <div> Children: ${thisPlaceMap.children.toLocaleString('en')   }</div>           
                    </div>`
                );
        }
    };

    // Mouse out event of place
    handleMouseOut =  function(vis) {
        //vis.tooltip
        //    .style("opacity", 0)
        //    .style("left", 0)
        //    .style("top", 0)
        //$("#v1-place-info")
        //    .html(``);
    };


}
