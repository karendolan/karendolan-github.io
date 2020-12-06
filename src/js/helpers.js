
/* * * * * * * * * * * * * *
*      NameConverter       *
* * * * * * * * * * * * * */

class NameConverter {
    constructor() {
        this.states = [
            ['Alabama', 'AL'],
            ['Alaska', 'AK'],
            ['American Samoa', 'AS'],
            ['Arizona', 'AZ'],
            ['Arkansas', 'AR'],
            ['Armed Forces Americas', 'AA'],
            ['Armed Forces Europe', 'AE'],
            ['Armed Forces Pacific', 'AP'],
            ['California', 'CA'],
            ['Colorado', 'CO'],
            ['Connecticut', 'CT'],
            ['Delaware', 'DE'],
            ['District of Columbia', 'DC'],
            ['Florida', 'FL'],
            ['Georgia', 'GA'],
            ['Guam', 'GU'],
            ['Hawaii', 'HI'],
            ['Idaho', 'ID'],
            ['Illinois', 'IL'],
            ['Indiana', 'IN'],
            ['Iowa', 'IA'],
            ['Kansas', 'KS'],
            ['Kentucky', 'KY'],
            ['Louisiana', 'LA'],
            ['Maine', 'ME'],
            ['Marshall Islands', 'MH'],
            ['Maryland', 'MD'],
            ['Massachusetts', 'MA'],
            ['Michigan', 'MI'],
            ['Minnesota', 'MN'],
            ['Mississippi', 'MS'],
            ['Missouri', 'MO'],
            ['Montana', 'MT'],
            ['Nebraska', 'NE'],
            ['Nevada', 'NV'],
            ['New Hampshire', 'NH'],
            ['New Jersey', 'NJ'],
            ['New Mexico', 'NM'],
            ['New York', 'NY'],
            ['North Carolina', 'NC'],
            ['North Dakota', 'ND'],
            ['Northern Mariana Islands', 'NP'],
            ['Ohio', 'OH'],
            ['Oklahoma', 'OK'],
            ['Oregon', 'OR'],
            ['Pennsylvania', 'PA'],
            ['Puerto Rico', 'PR'],
            ['Rhode Island', 'RI'],
            ['South Carolina', 'SC'],
            ['South Dakota', 'SD'],
            ['Tennessee', 'TN'],
            ['Texas', 'TX'],
            ['US Virgin Islands', 'VI'],
            ['Utah', 'UT'],
            ['Vermont', 'VT'],
            ['Virginia', 'VA'],
            ['Washington', 'WA'],
            ['West Virginia', 'WV'],
            ['Wisconsin', 'WI'],
            ['Wyoming', 'WY'],
        ]
    }

    getAbbreviation(input){
        let that = this
        let output = '';
        that.states.forEach( state => {
            if (state[0] === input){
            output = state[1]
        }})
        return output
    }

    getFullName(input){
        let that = this
        let output = '';
        that.states.forEach( state => {
            if (state[1] === input){
                output = state[0]
            }})
        return output
    }
}

let nameConverter = new NameConverter()

let upperCaseFirstLetters = (w) => {
    return w.toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g,
        letter => letter.toUpperCase());
}

/*
 * Helper to re-arrange censusData by Year and POB
 */
function arrangeCensusByYearStateCountry(censusData) {
    let arrangedData = [];
    // prepare census data by grouping all rows by Census Year
    let dataByCensusYear = Array.from(d3.group(censusData, d =>d["Year"]), ([key, value]) => ({key, value}))
    dataByCensusYear.forEach((year) => {
        let states = [];
        let countries = [];
        let dataByPOBInYear = Array.from(d3.group(year.value, d =>d["PO Birth"]), ([key, value]) => ({key, value}));
        // Sort by highest count
        dataByPOBInYear.sort((a,b) => {
            return (b.value.length - a.value.length);
        });

        // Make a separate state collection vs country collection
        // United Kingdom is special case
        let UK = {
            key: "United Kingdom",
            value: []
        };
        // USA is special case
        //"Usa"
        //"United States of America"
        let USA = {
            key: "United States of America",
            value: []
        };
        dataByPOBInYear.forEach((place) => {
            // test if state
            let placeName = nameConverter.getFullName(place.key);
            // move to relevant collection
            if (placeName) {
                states.push(place);
                // also push state to USA country
                USA.value.push(...place.value);
            } else {
                place.key = upperCaseFirstLetters(place.key);
                if (["Blank", "Canada East", "Canada Eng"].includes(place.key)) {
                    // Ignore these
                }
                // combine the 3 parts into UK
                else if (["Scotland", "England", "Wales"].includes(place.key)) {
                    UK.value.push(...place.value);
                } else if (place.key === "Usa") {
                    USA.value.push(...place.value);
                } else {
                    countries.push(place);
                }
            }
        })
        // Add special cases
        // Add individual states to USA
        states.forEach(s => {
            USA.value.push(s.value);
        })
        countries.push(UK);
        countries.push(USA);

        // Add to the year array
        arrangedData.push({
            year: +year.key,
            states: states,
            countries: countries
        })
    });
    // sort by year
    arrangedData.sort((a,b) => {
        return a.year - b.year;
    })

    console.log("Year array", arrangedData);
    return arrangedData;
}

/*
 * Helper to re-arrange censusData by Year and POB
 */
function normalizeDataForHookGraphs(censusData) {
    let arrangedData = [];

    const SPECIAL = [
        {
            names: ["SCOTLAND", "ENGLAND", "WALES"],
            convert: "United Kingdom"
        },{
            names: ["CANADA EAST", "CANADA ENG"],
            convert: "Canada"
        },{
            names: ["BLANK", "\n"],
            convert: "Unknown"
        }, {
            names: ["Usa", "USA", "United States", "America"],
            convert: "United States of America",
        }
    ]

    censusData.forEach((d) => {
        SPECIAL.forEach((c) => {
            if (c.names.includes(d["PO Birth"])) {
                d.pob = c.convert;
            }
            if (c.names.includes(d["FPO Birth"])) {
                d.fpob = c.convert;
            }
            if (c.names.includes(d["MPO Birth"])) {
                d.mpob = c.convert;
            }
        });

        d.pob = d.pob || d["PO Birth"];
        d.fpob = d.fpob || d["FPO Birth"];
        d.mpob = d.mpob || d["MPO Birth"];
        d.year = d.Year; // to make it easier to stick to lower case

        // get full state name for special state attribute
        let placeName = nameConverter.getFullName(d.pob)
        if (placeName) {
            // State
            d.statePob = placeName;
            // include country
            d.countryPob = "United States of America";
        } else {
            // Country
            // upper case words if POB is country
            placeName = upperCaseFirstLetters(d.pob);
            d.statePob = false;
            d.countryPob = placeName;
        }
    })

    // Only get top 7
    topPobByView = topPobByPlace(censusData, 7);

    // for color
    // make a place array for hookColor
    let states = topPobByView.statePob.map(d => d.location);
    let countries = topPobByView.countryPob.map(d => d.location);
    let hookColorDomain = [...states, ...countries];
    console.log("hookColorDomain", hookColorDomain);
    hookColor.domain(hookColorDomain);
    
    return censusData;
}

// Helper to get top place of birth for each origin in census by view type
function topPobByPlace(data, count) {
    // Group on state or country preference
    let topGroup = {};

    // loop for state and country
    viewsOpts.forEach(view => {
        let viewList = [];
        let viewFilteredData = data.filter(d => !!d[view]);
        let placeGroup = d3.group(viewFilteredData, d => d[view]);
        let placeTotals = Array.from((placeGroup),
            ([key, array]) => ({key: key, value: array.length})
        );
        placeTotals.forEach(t => {
            viewList.push({
                "location": t.key,
                "count": t.value
            })
        })
        viewList.sort((a, b) => b.count - a.count)
        topGroup[view] = viewList.slice(0, count);
        console.log("topGroup", topGroup);
    })
    return topGroup;
}

// remove spaces and all lower case
function normalizeName(placeName) {
    return placeName.replace(/[\W]/g, "").toLowerCase();
}


// Helper to add common classname across linked vis
// with placeName, adds the place to the ID,
// otherwise uses the current placeName context (country vs state)
function getPlaceClassId(placeName, view) {
    if (!view) {
        view = placeView;
    }
    if (!placeName){
        return `${view}`;
    } else {
        return `${view}-${normalizeName(placeName)}`
    }
}

let historicalHookInsights = {};
historicalHookInsights.statePob =
    [
        {year: 1860,
            text: [
                "1859: Nevada Comstock Lode discovered (silver & gold)",
                "Nevada is not a state until 1864",
                "California Gold Rush",
                "Industry takes control over California mines",
                "1863: American Civil War",
                "NYC Draft Riots related to Civil War",
                "Several US Indian Wars",
            ]
        },
        {year: 1880,
            text: [
                "California Gold Rush and Industry control of CA mines"
            ]
        },
        {year: 1900,
            text: [
                "1896 Utah granted statehood",
                "California Gold Rush and Industry control of CA mines"
            ]
        },
        {year: 1910,
            text: [
                "1902 Gold discovered at Goldfield, Nevada",
                "Nevada economic bust and population declines 1/4th"
            ]
        },
        {year: 1920,
            text: [
                ""
            ]
        },
    ];

historicalHookInsights.countryPob =
    [
        {year: 1860, text: [
                "Irish Famine (1 million emigrated)",
                "Chinese Civil Rebellions and Clan Wars (>35 million died)",
                "1866: Failed Irish Fenian Uprising",
            ]
        },
        {year: 1870, text: [
                "Irish Land War, return of potato blight",
                "1873: UK starts the Long Depression (economic recession)",
            ]
        },
        {year: 1880, text: [
                "Irish Land War, return of potato blight",
                "1873: UK starts the Long Depression (economic recession)",
            ]
        },
        {year: 1900,
            text: [
                "Chinese Exclusion Act of 1882 was made permanent in 1902",
                "1973: UK economy starts to improve",
                "Spanish-American War",
                "Start of poor rural Italian Diaspora"
            ]
        },
        {year: 1910,
            text: [
                "Greece in Balkan Wars",
                "Italo-Turkish War",
                "Spanish Restoration Crisis"
            ]
        },
        {year: 1920,
            text: [
                "1916: Irish Easter Rising",
                "1918: Start of Irish Independence"
            ]
        },
    ];

// Global color helper
//let hookColor = d3.scaleOrdinal(d3.schemeCategory10);
let hookColor = d3.scaleOrdinal()
    .range(['#543005','#8c510a','#bf812d','#dfc27d', '#80cdc1','#35978f','#01665e','#003c30']);

// Set the color
let hookColorLinear = d3.scaleLinear()
    .range(["white", "#00585B"]);


/* * * * * * * * * * * * * *
*         Carousel         *
* * * * * * * * * * * * * */

// define carousel behaviour
let carousel = $('#stateCarousel');

// prevent rotating
carousel.carousel({
    interval: false
})

// on button click switch view
function switchView(){
    carousel.carousel('next')
    $('#switchView').html() === 'map view'  ? $('#switchView').html('table view') : $('#switchView').html('map view');
}


