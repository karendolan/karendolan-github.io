/* * * * * * * * * * * * * *
*           MAIN           *
* * * * * * * * * * * * * */

// init global variables & switches
let myMapVis,
    myBarVisOne,
    myLineBrushVis,
    myDistanceVis,
    myBubbleVisM,
    myBubbleVisF,
    myAreaVis1,
    myAreaVis2,
    myAreaVis3;

let selectedTimeRange = [];
let selectedState = '';
let selectedPlace = '';
let selectedCategory = $('#categorySelector').val();
let selectedBubbleCensus = [];

let bubbleColors = ['#27D2DB','#DB447D','#454EDB','#B0DB57','#DB8E1B']

let coreState = "Nevada";
let normView = false
let viewsOpts = ["statePob", "countryPob"];
let placeView = viewsOpts[1]; //options are [countryPob|statePob]
let topPobByView = {};
// For including and excluding USA or Nevada in the results set (Vis1)
let includeNative = false;

// -- Time range slider ---
let slider = document.getElementById('slider');
let sliderMin = document.getElementById('slider-min');
let sliderMax = document.getElementById('slider-max');
let highDate, lowDate;

// Date parser
let formatDate = d3.timeFormat("%Y");
let parseDate = d3.timeParse("%Y");

let promises = [
        // Nevada Census data
        d3.csv("data/nvcensus-data-v2-NV-sparse.csv"),
        // USA state geoJson (non-projected)
        // d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
        d3.json("data/states-10m.json"),
        // World geoJson
        // d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json")
        d3.json("data/countries-50m.json")
    ];

var start = performance.now();
Promise.all(promises)
    .then( function(data){
        initMainPage(data)
    })
    .catch( function (err){console.log(err)} );


// initMainPage
function initMainPage(data) {

    console.log("Original data", data[0]);

    let trimmedData = data[0].map(function(d){
        // Create a possible personal identifier for the person accross census
        let pid = `${d["F Name"]}
                    -${d["PO Birth"]}
                    -${d["FPO Birth"]}-${d["MPO Birth"]}
                    -${d["Sex"]}
                    -${(+d["Year"] - +d["Five Year"])}`
            .replace(/[\W]/g, "")
            .toLowerCase();
        // The unique PID row includes census year on the end
        let pidCensusYear = `${pid}-${d['Year']}`;
        return {
            "PO Birth": d["PO Birth"],   // Subject POB
            "FPO Birth": d["FPO Birth"], // Father POB
            "MPO Birth": d["MPO Birth"], // Mother POB
            "Profession": d["Profession"],
            "County": d["County"],  // Nevada county the person is in when Census was taken
            // Convert string to 'date object'
            // "Year": parseDate(+d["Year"]),   // Year of the census
            "Year": +d["Year"],   // Year of the census
            "Sex": d["Sex"],             // Gender (M/F)
            "Age": +d["Age"] || +d["Age Years"],  // Age in years
            "AgeFiveYearGroup" : +d["Five Year"], // Age pre-grouped in 5 year grouping
            "FName": d["F Name"],        // First Name
            "Surname": d["Surname"],     // Second Name
            "Naturalize": d["Naturalize"], // If US naturalized (data in last 3 census)
            "Color": d["Color"],         // Race: B(lack), C(hinese), I(ndian), J(aponese), W(hite) , M(ulatto)
            "MarStat" : d["Mar Stat"],   // Marital status
            "FamilyNum" : +d["FN"],       // Number in family all census 1860, 1870, 1880, 1900, 1910, 1920
            "pid": pid, // a (potential) unique person ID across Census
            "pidCensusYear": pidCensusYear // a (potential) unique row identifier
        }
    })
    console.log(trimmedData)

    // Set initial date filter value
    lowDate = d3.min(data[0], d=> d.Year);
    highDate = d3.max(data[0], d=> d.Year);
    $('#time-period-low').text(lowDate);
    $('#time-period-high').text(highDate);

    // Hook vis
    // Common data format for the 3 vis for interconnection
    let moreAttrsData = normalizeDataForHookGraphs(trimmedData);
    // Params for map vis (parentElement, censusData, usaGeoData, worldGeoData)
    myMapVis = new MapVis('mapDiv', moreAttrsData, data[1], data[2]);
    myLineBrushVis = new LineBrushVis('timeLineDiv', moreAttrsData);

    // Rising insights
    myDistanceVis = new DistanceVis('distanceVisDiv', moreAttrsData);

    // Main message
    myAreaVis1 = new StackedAreaVis('Gender', trimmedData, 'Sex')
    myAreaVis2 = new StackedAreaVis('Race', trimmedData, 'Color')
    myAreaVis3 = new StackedAreaVis('Out-of-State', trimmedData, 'PO Birth')

    // Parting message
    myBubbleLegend = new BubbleLegend('bubble-legend', trimmedData)
    myBubbleVisM = new BubbleVis('men-bubble', trimmedData, "M")
    myBubbleVisF = new BubbleVis('women-bubble', trimmedData, "F")

    // Set a hover event over V1 placePob.
    setPobPlaceHover();
    // Add an alert for change on the V1 USA toggle
    $( "#v1ToggleNative" ).change(function() {
        includeNative = !includeNative;
        myLineBrushVis.wrangleData();
    });

}

// set when changing view type
function setPobPlaceHover() {
    // Make sure no existing hover listener
    $( ".placePob" ).off( "mouseenter mouseleave" );
    // Hover
    $( ".placePob" ).hover(
        function() {
            let thisPlaceName = null;
            let thisPlaceClass = null;
            // console.log($(this)[0].classList);
            $(this)[0].classList.forEach(c => {
                if (c.startsWith(`${placeView}-`)) {
                    thisPlaceClass = c; //.split("-")[1];
                    thisPlaceName = thisPlaceClass.split("-")[1];
                    // console.log("Found", thisPlaceName);
                }
            });
            if (thisPlaceClass) {
                // Only do action if the country has a count
                let count = myMapVis.getCount(myMapVis, thisPlaceName);
                if (count > 0) {
                    myMapVis.handleMouseOver(myMapVis, thisPlaceName);
                    // myBarVisOne.handleMouseOver(myBarVisOne, thisPlaceName);
                    myLineBrushVis.handlePlaceOver(myLineBrushVis, thisPlaceClass);

                    // $(".placePob").not('.line').css("opacity", .2);
                    // $( `.${thisPlaceClass}` ).css("opacity",1);
                }
            }
        }, function() {
            //
            myMapVis.handleMouseOut(myMapVis);
            // myBarVisOne.handleMouseOut(myBarVisOne);
            myLineBrushVis.handlePlaceOut(myLineBrushVis);
            // $( ".placePob" ).css("opacity", 1);
        }
    );

}

let yearList = [1860,1870,1880,1900,1910,1920];
let selectedYear = {
    year: 1860,
    index: 0
}

// Enclose relevant vis to update here
function updateVisualizationHook() {
    // myBarVisOne.wrangleData();
    myMapVis.wrangleData();
    myLineBrushVis.wrangleData();
    $('#time-period-low').text(lowDate);
    $('#time-period-high').text(highDate);
    setPobPlaceHover();
}

//-----------------------
// V1-Hook Hover Code
//-----------------------
// React to user selection for view type
d3.select("#chart-type").on("change", doGroupBy);
// use the filtered group
function doGroupBy() {
    // retrieve view by param
    placeView = d3.select("#chart-type").property("value");
    console.log("Change View by: ", placeView);
    // show or hide the "with USA" checkbox
    if (placeView === viewsOpts[0]) {
        $(".form-check-toggle-label").text("Include born in Nevada")
    } else {
        $(".form-check-toggle-label").text("Include born in USA")
    }
    updateVisualizationHook();
}

//-----------------------------------------
// V3 - Input change handlers
//-----------------------------------------
d3.select("#SAC-type").on("change", normalize);
function normalize() {
    // retrieve group by param
    normView = d3.select("#SAC-type").property("value");
    console.log("Change SAC View by: ", normView);
    myAreaVis1.wrangleData(normView)
    myAreaVis2.wrangleData(normView)
    myAreaVis3.wrangleData(normView)
}

//-----------------------
// V1-Hook Hover Code
//-----------------------
function onPlaceHover() {
    myMapVis.placeHover();
    myBarVisOne.placeHover();
    myLineBrushVis.placeHover();
}

//-----------------------------------------
// V2 - Rising insights checkbox listener
//-----------------------------------------
$(".v2-checkbox-input").on("change", function() {
    myDistanceVis.handleChange(myDistanceVis, this);
});

//-----------------------
// Writing Filter Code
//-----------------------
var checkbox1860 = document.getElementById("filter-1860");
var checkbox1870 = document.getElementById("filter-1870");
var checkbox1880 = document.getElementById("filter-1880");
var checkbox1900 = document.getElementById("filter-1900");
var checkbox1910 = document.getElementById("filter-1910");
var checkbox1920 = document.getElementById("filter-1920");

$('#bubble-dropdown').click(function(v){
    var targetedYear = v.target.innerText.substr(1,4)
    var filterID = `#filter-${targetedYear}`
    var currentCheck = $( filterID ).prop("checked")
    $( filterID ).prop( "checked", !currentCheck);

    if(!currentCheck) {
        if(targetedYear != ""){
            selectedBubbleCensus.push(targetedYear)
        }
    } else {
        selectedBubbleCensus = selectedBubbleCensus.filter(type => type !== targetedYear)
    }

    myBubbleVisM.wrangleData()
    myBubbleVisF.wrangleData()
});

checkbox1860.addEventListener( 'change', function() {
    if(this.checked) {
        selectedBubbleCensus.push("1860")
    } else {
        selectedBubbleCensus = selectedBubbleCensus.filter(type => type !== "1860")
    }
    myBubbleVisM.wrangleData()
    myBubbleVisF.wrangleData()
});

checkbox1870.addEventListener( 'change', function() {
    if(this.checked) {
        selectedBubbleCensus.push("1870")
    } else {
        selectedBubbleCensus = selectedBubbleCensus.filter(type => type !== "1870")
    }
    myBubbleVisM.wrangleData()
    myBubbleVisF.wrangleData()
});

checkbox1880.addEventListener( 'change', function() {
    if(this.checked) {
        selectedBubbleCensus.push("1880")
    } else {
        selectedBubbleCensus = selectedBubbleCensus.filter(type => type !== "1880")
    }
    myBubbleVisM.wrangleData()
    myBubbleVisF.wrangleData()
});

checkbox1900.addEventListener( 'change', function() {
    if(this.checked) {
        selectedBubbleCensus.push("1900")
    } else {
        selectedBubbleCensus = selectedBubbleCensus.filter(type => type !== "1900")
    }
    myBubbleVisM.wrangleData()
    myBubbleVisF.wrangleData()
});

checkbox1910.addEventListener( 'change', function() {
    if(this.checked) {
        selectedBubbleCensus.push("1910")
    } else {
        selectedBubbleCensus = selectedBubbleCensus.filter(type => type !== "1910")
    }
    myBubbleVisM.wrangleData()
    myBubbleVisF.wrangleData()
});

checkbox1920.addEventListener( 'change', function() {
    if(this.checked) {
        selectedBubbleCensus.push("1920")
    } else {
        selectedBubbleCensus = selectedBubbleCensus.filter(type => type !== "1920")
    }
    myBubbleVisM.wrangleData()
    myBubbleVisF.wrangleData()
});

