/** * (c) Espacorede Project * **/

const windowProtocol2 = window.location.protocol;
const windowHost2 = window.location.host;

const formatNumber = (number) => number.toLocaleString("en-UK");

const formatDate = (date) => {
    const timezone = date.getTimezoneOffset();
    if (timezone > 0) {
        const offset = Math.ceil(date.getHours() + timezone / 60);
        date.setHours(offset, 0, 0, 0);
    }

    return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
};

let numberOfDots = 1;
setInterval(() => {
    numberOfDots = (++numberOfDots % 5) || 1;
    for (let element of document.getElementsByClassName("dots")) {
        element.innerText = Array(numberOfDots).join(".");
    }
}, 500);

function getFirstIndex(array) {
    let element = -1;
    array.some((value, index) => {
        if (value) {
            element = index;
            return true;
        }
    });

    if (element === -1) {
        throw "All the elements in this array are falsy";
    }

    return element;
}

const socketio = io();

const selectedUser = cleanUserName(decodeURI(window.location.pathname.split("/")[3]));

let contributionsByDay;
let contributionsByHour;
let contributionsByMonth;
let contributionsByWeekDay;
let contributionsByYear;
let contributionsByWeekAndHour;
let contributionsByYearAndMonth;
let namespaceEdits;

let loading = true;
let updating = false;

window.onload = () => {
    document.getElementById("userBig").addEventListener("keyup", (listener) => {
        listener.preventDefault();

        if (listener.keyCode === 13) {
            if (document.getElementById("userBig").value) {
                searchUser("userBig");
            }
        }
    });

    console.log(`Requesting ${selectedUser} data from server...`);
    socketio.emit("load", selectedUser, selectedWiki);

    setInterval(() => {
        if (loading || updating) {
            socketio.emit("load", selectedUser, selectedWiki);
        }
    }, 60000);
};

socketio.on("notfound", (user, wiki) => {
    if (user === selectedUser && wiki === selectedWiki) {
        showPage(null, true);
    }
});

socketio.on("noedits", (user, wiki) => {
    if (user === selectedUser && wiki === selectedWiki) {
        console.log("User has no edits!");
        document.querySelector(".error-title").innerHTML = `User ${selectedUser} has no edits!`;
        let caseNote = document.querySelector(".case-note");
        if (caseNote) {
            caseNote.style.display = "none";
        }
        document.querySelector(".error-message").classList.add("hidden");
        showPage(null, true);
    }
});

socketio.on("update", (user, wiki) => {
    if (user === selectedUser && wiki === selectedWiki) {
        document.getElementById("updating").style.visibility = "visible"
        document.querySelector(".error-message").innerHTML = "User found, adding to database...";
        updating = true;
    }
});

socketio.on("disconnect", (message) => {
    for (let element of document.getElementsByClassName("lost-connection")) {
        element.style.display = "inline";
    }

    for (let element of document.getElementsByClassName("lost-connection-update")) {
        element.style.display = "inline";
    }

    if (message === "io server disconnect") {
        socketio.connect();
    }
});

socketio.on("reconnect", () => {
    if (loading || updating) {
        socketio.emit("load", selectedUser, selectedWiki);
    }

    for (let element of document.getElementsByClassName("lost-connection")) {
        element.style.display = "none";
    }
});

socketio.on(selectedUser, (message) => {
    if (!message || message.uWiki !== selectedWiki) {
        return;
    }

    console.log("Data received!");

    let data = message;

    if (data.uName === selectedUser) {
        if (data.uTotalEdits === 0) {
            showPage(null, true);
            return;
        }

        document.getElementById("user-url").setAttribute("href", data.wLinks + "User:" + encodeURIComponent(selectedUser));
        document.getElementById("user-url").setAttribute("class", data.uClass);

        if (data.uIsExpensive) {
            document.getElementById("bot-note").classList.remove("hidden");
        }

        document.getElementById("user-registration").innerText = data.uRegistration;
        document.getElementById("user-registration-from-now").setAttribute("title", (data.uRegistrationFromNowDays ? data.uRegistrationFromNowDays.toString() : "?") + " day(s) ago");
        document.getElementById("user-registration-from-now").innerText = data.uRegistrationFromNow;

        document.getElementById("updating").style.color = "#eeeeee";

        document.getElementById("user-total-edits").setAttribute("href", data.wSpecialContributions);
        document.getElementById("user-total-edits").innerText = data.uTotalEdits;

        document.getElementById("user-total-edits-minus-creations").innerText = "(Edits: " + data.uTotalEditsMinusCreations.toString() + ")";

        document.getElementById("user-minor-edits").innerText = data.uMinorEdits;

        document.getElementById("user-pages-created").setAttribute("href", data.wSpecialContributions + "&newOnly=1&namespace=6&nsInvert=1");
        document.getElementById("user-pages-created").innerText = data.uPagesCreated;

        document.getElementById("user-uploads-plus-new-versions").setAttribute("href", data.wFiles);
        document.getElementById("user-uploads-plus-new-versions").innerText = data.uUploadsPlusNewVersions;

        document.getElementById("user-uploads").innerText = "(Creations: " + data.uUploads + ")";

        document.getElementById("user-block-count").innerText = data.uBlockCount;
        document.getElementById("user-delete-count").innerText = data.uDeleteCount;

        if (data.uHasRights) {
            document.getElementById("user-has-rights").removeAttribute("class");
        }

        let topPages = document.getElementById("user-top-pages");

        topPages.innerHTML = "";

        if (data.uTopPages.length > 1) {
            topPages.appendChild(document.createElement("br"));
            document.getElementById("plural").innerText = "s";

            for (let i = 0; i < Math.min(4, data.uTopPages.length); i += 1) {
                let topPage = data.uTopPages[i];
                let topPageLink = document.createElement("a");
                topPageLink.setAttribute("href", data.wLinks + topPage);
                topPageLink.setAttribute("class", "top-page top-margin");
                topPageLink.innerText = topPage;
                topPages.appendChild(topPageLink);
                topPages.appendChild(document.createElement("br"));
            }

            if (data.uTopPages.length > 4) {
                let moreTopPagesSpan = document.createElement("span");
                moreTopPagesSpan.setAttribute("class", "top-page top-margin more");
                moreTopPagesSpan.innerText = "...and " + data.uTopPages.slice(4).length + " more!";
                topPages.appendChild(moreTopPagesSpan);
                topPages.appendChild(document.createElement("br"));
            }

            let topPageEditCount = document.createElement("span");
            topPageEditCount.setAttribute("class", "top-page top-margin");

            let editsPlural = data.uTopPageCount > 1 ? " edits " : " edit ";
            topPageEditCount.innerText = "(" + data.uTopPageCount.toString() + editsPlural + "each)";
            topPages.appendChild(topPageEditCount);
        } else {
            document.getElementById("plural").innerText = "";
            let topPageLink = document.createElement("a");
            topPageLink.setAttribute("href", data.wLinks + encodeURIComponent(data.uTopPages[0]));
            topPageLink.setAttribute("class", "top-page first");
            topPageLink.innerText = data.uTopPages[0];
            topPages.appendChild(topPageLink);

            let topPageEditCount = document.createElement("span");
            topPageEditCount.innerText = " (" + data.uTopPageCount.toString() + ")";
            topPages.appendChild(topPageEditCount);
        }

        document.getElementById("user-most-edits-in-a-single-day").innerText = data.uSingleDayOverall;

        document.getElementById("user-most-edits-date").setAttribute("title", "Achieved on " + data.uSingleDayOverallDateTip);
        document.getElementById("user-most-edits-date").innerText = "(" + data.uSingleDayOverallDate + ")";

        document.getElementById("user-unique-pages").innerText = data.uPagesEdited;

        const formatStreak = s => formatDate(new Date(s));

        if (data.uStreakCurrent.start) {
            document.getElementById("user-streak-count-current-b").setAttribute("title", "Since " + formatStreak(data.uStreakCurrent.start));
            document.getElementById("user-streak-count-current-b").setAttribute("class", "tooltip");
        }

        document.getElementById("user-streak-count-current").innerText = data.uStreakCountCurrent;

        let currentStreakPlural = document.getElementById("user-streak-current-plural");

        if (data.uStreakCountCurrent === "1") {
            currentStreakPlural.innerText = "";
        }
        else {
            currentStreakPlural.innerText = "s";
        }

        if (data.uStreak.start) {
            if (data.uStreak.start === data.uStreakCurrent.start &&
                data.uStreak.end === data.uStreakCurrent.end) {
                document.getElementById("user-streak-count-b").setAttribute("title", "Since " + formatStreak(data.uStreak.start));
            }
            else {
                document.getElementById("user-streak-count-b").setAttribute("title", formatStreak(data.uStreak.start) + " - " + formatStreak(data.uStreak.end));
            }
            document.getElementById("user-streak-count-b").setAttribute("class", "tooltip");
        }

        document.getElementById("user-streak-count").innerText = data.uStreakCount;

        let streakPlural = document.getElementById("user-streak-plural");

        if (data.uStreakCount === "1") {
            streakPlural.innerText = "";
        }
        else {
            streakPlural.innerText = "s";
        }

        document.getElementById("user-edits-last-30").innerText = data.uEditsLast30;
        document.getElementById("user-edits-last-7").innerText = data.uEditsLast7;
        document.getElementById("user-edits-last-semester").innerText = data.uEditsLast6Months;
        document.getElementById("user-edits-last-year").innerText = data.uEditsLastYear;
        document.getElementById("user-edits-alltime").innerText = data.uEditsAllTime;

        showPage(true);

        // Getting the graphs ready 
        const transposeArray = array => array[getFirstIndex(array)].map((x, i) => array.map(y => y ? y[i] : null));
        const sum2dArray = array => array.map(x => x ? x.reduce((a, b) => a + b, 0) : null);

        contributionsByDay = data.cContribsByDate;
        contributionsByWeekAndHour = data.cContribsWeekAndHour;
        contributionsByHour = sum2dArray(transposeArray(data.cContribsWeekAndHour));
        contributionsByWeekDay = sum2dArray(data.cContribsWeekAndHour);

        contributionsByYearAndMonth = data.cContribsByYM;
        contributionsByYearAndMonth.reverse();
        contributionsByMonth = sum2dArray(transposeArray(data.cContribsByYM));
        contributionsByYear = sum2dArray(data.cContribsByYM);

        namespaceEdits = data.uNSEdits;

        loading = false;
        updating = false;

        loadCharts();
    }
});

function loadCharts() {
    google.charts.load("current", { "packages": ["corechart"] });
    google.charts.setOnLoadCallback(drawYearSelection);
    google.charts.setOnLoadCallback(drawNamespacesChart);
    google.charts.setOnLoadCallback(drawHourChart);
    google.charts.setOnLoadCallback(drawWeekChart);
    google.charts.setOnLoadCallback(drawDaySelection);
    google.charts.setOnLoadCallback(drawMonthChart);
    google.charts.setOnLoadCallback(drawYearChart);
    showPage(false);
}

function calculateChartTicks(maxValue) {
    let ticks = [];

    if (maxValue < 4) {
        for (let i = 0; i <= maxValue; i += 1) {
            ticks.push(i);
        }
    } else {
        while (maxValue % 4 !== 0) {
            maxValue += 1;
        }

        for (let i = 0; i <= maxValue; i += maxValue / 4) {
            ticks.push(i);
        }
    }

    return ticks;
}

let selectedYear;
let selectedMonth;

const months = ["Jan", "Feb", "Mar", "Apr",
    "May", "Jun", "Jul", "Aug",
    "Sept", "Oct", "Nov", "Dec"];

const fullMonths = ["January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"];

function drawYearSelection() {
    document.getElementById("timeline-select-year").innerHTML = "";

    for (let i = contributionsByYear.length - 1; i >= 0; i -= 1) {
        if (contributionsByYear[i]) {
            drawYearSelector(i);
        }
    }

    if (selectedYear === undefined) {
        selectedYear = getFirstIndex(contributionsByYearAndMonth);
    }

    document.getElementById("year" + selectedYear).setAttribute("class", "selected-year");

    selectYear(selectedYear);
}

function drawYearSelector(n) {
    let yearSelector = document.createElement("span");

    yearSelector.setAttribute("id", "year" + n);
    yearSelector.setAttribute("onClick", "selectYear(" + n + ")");
    yearSelector.innerText = new Date().getUTCFullYear() - n;

    document.getElementById("timeline-select-year").appendChild(yearSelector);
}

function selectYear(year) {
    let monthSelection = document.getElementById("timeline-select-month");
    monthSelection.innerHTML = "";

    let overallViewSpan = document.createElement("span");
    overallViewSpan.setAttribute("id", "month-overall");
    overallViewSpan.setAttribute("onClick", "drawOverallTimelineChart(" + year + ")");
    overallViewSpan.innerText = "Overview";
    monthSelection.appendChild(overallViewSpan);

    for (let i = 0; i < contributionsByYearAndMonth[year].length; i += 1) {
        if (contributionsByYearAndMonth[year][i]) {
            drawMonthSelector(i);
        }
    }

    selectedYear = year;

    document.querySelector(".selected-year").removeAttribute("class");
    document.getElementById("year" + year).setAttribute("class", "selected-year");

    if (selectedMonth !== undefined && selectedMonth !== null &&
        !contributionsByYearAndMonth[year][selectedMonth]) {
        selectedMonth = null;
    }

    if (selectedMonth === undefined || selectedMonth === null) {
        overallViewSpan.setAttribute("class", "selected-month");
        drawOverallTimelineChart(year);
    } else {
        document.getElementById("month" + selectedMonth).setAttribute("class", "selected-month");
        drawMonthTimelineChart(selectedMonth);
    }
}

function drawMonthSelector(monthNumber) {
    let monthSelector = document.createElement("span");

    monthSelector.setAttribute("id", "month" + monthNumber);
    monthSelector.setAttribute("onClick", "drawMonthTimelineChart(" + monthNumber + ")");
    monthSelector.innerText = fullMonths[monthNumber];

    document.getElementById("timeline-select-month").appendChild(monthSelector);
}

function buildTooltip(top, bottomLabel, bottomNumber) {
    let ul = document.createElement("ul");
    ul.setAttribute("class", "google-visualization-tooltip-item-list");
    ul.style = "";

    let topItemli = document.createElement("li");
    topItemli.setAttribute("class", "google-visualization-tooltip-item");
    topItemli.style = "";

    let topItemContent = document.createElement("span");
    topItemContent.style = "font-family: Arial; font-size: 12px; color: rgb(0, 0, 0); opacity: 1; margin: 0px; text-decoration: none; font-weight: bold;";
    topItemContent.innerText = top;

    topItemli.appendChild(topItemContent);
    ul.appendChild(topItemli);

    let bottomItemli = document.createElement("li");
    bottomItemli.setAttribute("class", "google-visualization-tooltip-item");
    bottomItemli.style = "";

    let bottomItemLabel = document.createElement("span");
    bottomItemLabel.style = "font-family: Arial; font-size: 12px; color: rgb(0, 0, 0); opacity: 1; margin: 0px; text-decoration: none;";

    let bottomItemNumber = document.createElement("span");
    bottomItemNumber.style = "font-family: Arial; font-size: 12px; color: rgb(0, 0, 0); opacity: 1; margin: 0px; text-decoration: none;";

    bottomItemLabel.innerText = bottomLabel;

    bottomItemli.appendChild(bottomItemLabel);

    bottomItemNumber.style.fontWeight = "bold";
    bottomItemNumber.innerText = ` ${bottomNumber}`;

    bottomItemli.appendChild(bottomItemNumber);
    ul.appendChild(bottomItemli);

    return ul.outerHTML;
}

function drawOverallTimelineChart(year) {
    let chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Month");
    chartData.addColumn("number", "Edits");
    chartData.addColumn({ type: "string", role: "tooltip", "p": { "html": true } });

    let monthEdits = contributionsByYearAndMonth[year];

    for (let i = 0; i < 12; i += 1) {
        const tooltipText = buildTooltip(`${fullMonths[i]} ${new Date().getUTCFullYear() - selectedYear}`,
            "Edits:", formatNumber(monthEdits[i]));
        chartData.addRow([months[i], monthEdits[i], tooltipText]);
    }

    const vAxisTicks = calculateChartTicks(Math.max(...monthEdits));

    const chartOptions = {
        tooltip: { trigger: "both", isHtml: true, ignoreBounds: false },
        vAxis: { title: "Edits", minValue: 0, ticks: vAxisTicks },
        legend: { position: "none" },
        colors: ["rgb(179, 82, 21)"],
        backgroundColor: "#eeeeee",
        chartArea: { top: 30 },
        width: "100%",
        height: 400
    };

    let chart = new google.visualization.ColumnChart(document.getElementById("edits-timeline"));
    chart.draw(chartData, chartOptions);

    selectedMonth = null;
    document.querySelector(".selected-month").removeAttribute("class");
    document.getElementById("month-overall").setAttribute("class", "selected-month");
}

function drawMonthTimelineChart(month) {
    let chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Date");
    chartData.addColumn("number", "Edits");
    chartData.addColumn({ type: "string", role: "tooltip", "p": { "html": true } });

    let year = contributionsByDay[selectedYear][month];

    const daysThisMonth = new Date(new Date().getUTCFullYear() - selectedYear, month + 1, 0).getUTCDate();

    const dateFormatted = (day) => formatDate(new Date(new Date().getUTCFullYear() - selectedYear, month, day));

    let maxValue = 0;

    for (let i = 1; i <= daysThisMonth; i += 1) {
        if (year[i]) {
            if (year[i] > maxValue) {
                maxValue = year[i];
            }

            const tooltipText = buildTooltip(dateFormatted(i),
                "Edits:", year[i]);
            chartData.addRow([i.toString(), year[i], tooltipText]);
        } else {
            const tooltipText = buildTooltip(dateFormatted(i),
                "Edits:", "None");
            chartData.addRow([i.toString(), 0, tooltipText]);
        }
    }

    const vAxisTicks = calculateChartTicks(maxValue);

    let fontSize = 13;

    if (daysThisMonth === 28) {
        fontSize = 15;
    } else if (daysThisMonth === 29) {
        fontSize = 14;
    }

    const chartOptions = {
        tooltip: { trigger: "both", isHtml: true, ignoreBounds: false },
        legend: { position: "none" },
        hAxis: { textStyle: { fontSize: fontSize } },
        vAxis: { title: "Edits", minValue: 0, ticks: vAxisTicks },
        colors: ["rgb(179, 82, 21)"],
        backgroundColor: "#eeeeee",
        width: "100%",
        height: 400
    };

    let chart = new google.visualization.LineChart(document.getElementById("edits-timeline"));
    chart.draw(chartData, chartOptions);

    selectedMonth = month;
    document.querySelector(".selected-month").removeAttribute("class");
    document.getElementById("month" + month).setAttribute("class", "selected-month");
}

function drawNamespacesChart() {
    let chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Namespace");
    chartData.addColumn("number", "Edits");

    if (namespaceEdits) {
        let namespaceTuples = [];
        for (let namespace in namespaceEdits) {
            namespaceTuples.push([namespace, namespaceEdits[namespace]]);
        }
        namespaceTuples.sort((a,b) => b[1] - a[1]);

        chartData.addRows(namespaceTuples);

        const chartOptions = {
            tooltip: { trigger: "both", isHtml: true, ignoreBounds: false },
            backgroundColor: "#eeeeee",
            sliceVisibilityThreshold: 0,
            width: "100%",
            height: 400
        };

        let chart = new google.visualization.PieChart(document.getElementById("edits-byns"));
        chart.draw(chartData, chartOptions);
    }
}

const hoursFull = [
    "12 AM", "1 AM", "2 AM", "3 AM", "4 AM",
    "5 AM", "6 AM", "7 AM", "8 AM", "9 AM",
    "10 AM", "11 AM", "12 PM", "1 PM", "2 PM",
    "3 PM", "4 PM", "5 PM", "6 PM", "7 PM",
    "8 PM", "9 PM", "10 PM", "11 PM"
];

function drawHourChart() {
    let chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Hour");
    chartData.addColumn("number", "Edits");
    chartData.addRows([
        [hoursFull[0], contributionsByHour[0]],
        [hoursFull[1], contributionsByHour[1]],
        [hoursFull[2], contributionsByHour[2]],
        [hoursFull[3], contributionsByHour[3]],
        [hoursFull[4], contributionsByHour[4]],
        [hoursFull[5], contributionsByHour[5]],
        [hoursFull[6], contributionsByHour[6]],
        [hoursFull[7], contributionsByHour[7]],
        [hoursFull[8], contributionsByHour[8]],
        [hoursFull[9], contributionsByHour[9]],
        [hoursFull[10], contributionsByHour[10]],
        [hoursFull[11], contributionsByHour[11]],
        [hoursFull[12], contributionsByHour[12]],
        [hoursFull[13], contributionsByHour[13]],
        [hoursFull[14], contributionsByHour[14]],
        [hoursFull[15], contributionsByHour[15]],
        [hoursFull[16], contributionsByHour[16]],
        [hoursFull[17], contributionsByHour[17]],
        [hoursFull[18], contributionsByHour[18]],
        [hoursFull[19], contributionsByHour[19]],
        [hoursFull[20], contributionsByHour[20]],
        [hoursFull[21], contributionsByHour[21]],
        [hoursFull[22], contributionsByHour[22]],
        [hoursFull[23], contributionsByHour[23]],
    ]);

    const vAxisTicks = calculateChartTicks(Math.max(...contributionsByHour));

    const chartOptions = {
        tooltip: { trigger: "both", isHtml: true, ignoreBounds: false },
        vAxis: { title: "Edits", minValue: 0, ticks: vAxisTicks },
        legend: { position: "none" },
        colors: ["rgb(179, 82, 21)"],
        chartArea: { top: 30 },
        backgroundColor: "#eeeeee",
        width: "50%",
        height: 300
    };

    let chart = new google.visualization.ColumnChart(document.getElementById("edits-hours"));
    chart.draw(chartData, chartOptions);
}

const weekDays = [
    "Sun", "Mon", "Tue",
    "Wed", "Thu", "Fri",
    "Sat"
];

const fullDays = [
    "Sunday", "Monday", "Tuesday",
    "Wednesday", "Thursday", "Friday",
    "Saturday"
];

function drawWeekChart() {
    let chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Hour");
    chartData.addColumn("number", "Edits");
    chartData.addColumn({ type: "string", role: "tooltip", "p": { "html": true } });

    for (let i = 0; i < 7; i += 1) {
        const tooltipText = buildTooltip(fullDays[i],
            "Edits:", formatNumber(contributionsByWeekDay[i]));
        chartData.addRow([weekDays[i], contributionsByWeekDay[i], tooltipText]);
    }

    const vAxisTicks = calculateChartTicks(Math.max(...contributionsByWeekDay));

    const chartOptions = {
        tooltip: { trigger: "both", isHtml: true, ignoreBounds: false },
        vAxis: { title: "Edits", minValue: 0, ticks: vAxisTicks },
        legend: { position: "none" },
        colors: ["rgb(179, 82, 21)"],
        chartArea: { top: 30 },
        backgroundColor: "#eeeeee",
        width: "50%",
        height: 300
    };

    let chart = new google.visualization.ColumnChart(document.getElementById("edits-week"));
    chart.draw(chartData, chartOptions);
}


let selectedDay;

function drawDaySelection() {
    document.getElementById("week-hour-select").innerHTML = "";

    for (let i = 0; i < contributionsByWeekAndHour.length; i += 1) {
        if (contributionsByWeekAndHour[i].some(v => v)) {
            drawDaySelector(i);
        }
    }

    if (selectedDay === undefined) {
        selectedDay = new Date().getDay();
        if (!contributionsByWeekDay[selectedDay]) {
            selectedDay = getFirstIndex(contributionsByWeekDay);
        }
    }

    document.getElementById("day" + selectedDay).setAttribute("class", "selected-week");
    drawWeekAndHourChart(selectedDay);
}

function drawDaySelector(d) {
    let selector = document.createElement("span");

    selector.setAttribute("onclick", "drawWeekAndHourChart(" + d + ")");
    selector.setAttribute("id", "day" + d);
    selector.innerText = fullDays[d];

    document.getElementById("week-hour-select").appendChild(selector);
}

function drawWeekAndHourChart(day) {
    const hourEdits = contributionsByWeekAndHour[day];

    let chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Hour");
    chartData.addColumn("number", "Edits");

    for (let i = 0; i < 24; i += 1) {
        chartData.addRow([hoursFull[i], hourEdits[i]]);
    }

    const vAxisTicks = calculateChartTicks(Math.max(...hourEdits));

    const chartOptions = {
        tooltip: { trigger: "both", isHtml: true, ignoreBounds: false },
        vAxis: {
            title: "Edits",
            viewWindowMode: "explicit",
            viewWindow: {
                min: 0
            },
            minValue: 0,
            ticks: vAxisTicks
        },
        legend: { position: "none" },
        colors: ["rgb(179, 82, 21)"],
        backgroundColor: "#eeeeee",
        height: 300,
        chartArea: { top: 30 }
    };

    let chart = new google.visualization.ColumnChart(document.getElementById("edits-wh"));
    chart.draw(chartData, chartOptions);

    document.querySelector(".selected-week").removeAttribute("class");
    document.getElementById("day" + day).setAttribute("class", "selected-week");
}

function drawMonthChart() {
    let chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Month");
    chartData.addColumn("number", "Edits");
    chartData.addColumn({ type: "string", role: "tooltip", "p": { "html": true } });

    for (let i = 0; i < 12; i += 1) {
        const tooltipText = buildTooltip(fullMonths[i],
            "Edits:", formatNumber(contributionsByMonth[i]));
        chartData.addRow([months[i], contributionsByMonth[i], tooltipText]);
    }

    const vAxisTicks = calculateChartTicks(Math.max(...contributionsByMonth));

    const chartOptions = {
        tooltip: { trigger: "both", isHtml: true, ignoreBounds: false },
        vAxis: { title: "Edits", minValue: 0, ticks: vAxisTicks },
        legend: { position: "none" },
        colors: ["rgb(179, 82, 21)"],
        backgroundColor: "#eeeeee",
        chartArea: { top: 30 },
        width: "50%",
        height: 300
    };

    let chart = new google.visualization.ColumnChart(document.getElementById("edits-month"));
    chart.draw(chartData, chartOptions);
}

function drawYearChart() {
    let chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Year");
    chartData.addColumn("number", "Edits");

    let activeYears = contributionsByYear.slice(0);

    let emptyYears = 0;

    while (activeYears[0] === undefined || activeYears[0] === null) {
        activeYears.shift();
        emptyYears += 1;
    }

    let currentYear = new Date().getUTCFullYear();

    for (let i = activeYears.length - 1; i >= 0; i -= 1) {
        let editsThisYear = 0;

        if (activeYears[i]) {
            editsThisYear = activeYears[i];
        }

        chartData.addRow([(currentYear - i - emptyYears).toString(), editsThisYear]);
    }

    const vAxisTicks = calculateChartTicks(Math.max(...contributionsByYear));

    const chartOptions = {
        tooltip: { trigger: "both", isHtml: true, ignoreBounds: false },
        vAxis: {
            title: "Edits",
            viewWindowMode: "explicit",
            viewWindow: {
                min: 0
            },
            minValue: 0,
            ticks: vAxisTicks
        },
        legend: { position: "none" },
        colors: ["rgb(179, 82, 21)"],
        backgroundColor: "#eeeeee",
        chartArea: { top: 30 },
        width: "50%",
        height: 300
    };

    let chart = new google.visualization.LineChart(document.getElementById("edits-year"));
    chart.draw(chartData, chartOptions);
}

// Se "partial" for false, a área dos gráficos é exibida e a mensagem de carregamento é escondida
function showPage(partial, notFound = false) {
    if (!notFound) {
        document.getElementById("error").style.display = "none";
        document.getElementById("preloader").style.display = "block";
        document.getElementById("user-content-top").style.display = "block";
        document.getElementById("loading-top").style.display = "none";
        document.getElementById("loading-bot").style.display = "block";
        document.getElementById("preloader").classList.remove("partial");

        if (!partial) {
            document.getElementById("user-content-bottom").style.display = "block";
            document.getElementById("loading-bot").style.display = "none";
            document.getElementById("preloader").style.display = "none";
        }
    } else {
        document.getElementById("error").style.display = "block";
        document.getElementById("preloader").style.display = "none";
    }
}

// Modal "comprar usuário"
// mui.js deve ser incluindo antes desse arquivo
function compareModal() {
    let modalElement = document.createElement("div");

    modalElement.innerHTML = `
    <div class="mui-row mui--text-center">
        <div class="mui-col-md-12" style="margin-top: 5%">
            <div class="mui--text-title">Compare ${selectedUser}'s statistics<div>
        </div>
        <br><br>
        <div class="mui-col-md-6 mui-col-md-offset-3">
            <div class="mui-textfield">
                <input type="text" id="compare-user" placeholder="Search user...">
            </div>

            <button class="mui-btn" style="background-color: #f55a4e !important;" onclick="javascript:mui.overlay('off');">
                Cancel
            </button>
            <button class="mui-btn mui-btn--primary" onclick="javascript:compareUser();">
                Go!
            </button>
        </div>
    </div>`;

    modalElement.style.width = "500px";
    modalElement.style.height = "250px";
    modalElement.style.margin = "250px auto";
    modalElement.style.backgroundColor = "#fff";

    mui.overlay("on", modalElement);

    let compareText = document.getElementById("compare-user");
    compareText.addEventListener("keyup", (listener) => {
        listener.preventDefault();

        if (listener.keyCode === 13) {
            if (compareText.value) {
                compareUser();
            }
        }
    })
}

function compareUser() {
    let target = document.getElementById("compare-user").value;

    if (target === "") {
        alert("Please insert a valid name.");
        return;
    }

    if (history.pushState) {
        let url = `${windowProtocol2}//${windowHost2}/${selectedWiki}/user/${selectedUser}/compare?user=${target}`;
        window.history.pushState({
            path: url
        }, "", url);
        location.reload();
    } else {
        window.location.href = `${windowProtocol2}//${windowHost2}/${selectedWiki}/user/${selectedUser}/compare?user=${target}`;
        location.reload();
    }
}

function cleanUserName(name) {
    let nameClean = name.trim();
    nameClean = nameClean.charAt(0).toUpperCase() + nameClean.slice(1);

    if (name !== nameClean) {
        if (history.pushState) {
            let url = `${windowProtocol2}//${windowHost2}/${selectedWiki}/user/${nameClean}`;
            window.history.pushState({
                path: url
            }, "", url);
        } else {
            window.location.href = `${windowProtocol2}//${windowHost2}/${selectedWiki}/user/${nameClean}`;
        }
    }

    return nameClean;
}