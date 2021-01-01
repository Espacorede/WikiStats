/** ** (c) Espacorede Project ** **/

const socketio = io();
const selectedUser = cleanUserName(decodeURI(window.location.pathname.split("/")[3]));
const userString = `${selectedUser}-${selectedWiki}`;
let numberOfDots = 1;
let graphsLoaded = false;
let contributionsByDay;
let contributionsByHour;
let contributionsByMonth;
let contributionsByWeekDay;
let contributionsByYear;
let contributionsByWeekAndHour;
let contributionsByYearAndMonth;
let namespaceEdits;
let languageEdits;
let loading = true;
let updating = true;
let tabsActive = true;

setInterval(() => {
    numberOfDots = (++numberOfDots % 5) || 1;
    for (const element of document.getElementsByClassName("dots")) {
        element.innerText = Array(numberOfDots).join(".");
    }
}, 500);

window.addEventListener("load", () => {
    document.getElementById("userBig").addEventListener("keyup", (listener) => {
        listener.preventDefault();

        if (listener.keyCode === 13) {
            if (document.getElementById("userBig").value) {
                searchUser("userBig");
            }
        }
    });

    socketio.emit("load", selectedUser, selectedWiki);

    setInterval(() => {
        if (loading || updating) {
            socketio.emit("load", selectedUser, selectedWiki);
        }
    }, 60000);

    // Begin temp code for Fandom (AC Wiki)
    if (selectedWiki === "ac") {
        // Hide bytes stats (no sizediff)
        document.getElementById("sstat-bytes").style.display = "none";
        document.getElementById("sstat-bytes-average").style.display = "none";
        document.getElementById("sstat-bytes-balance").style.display = "none";
        // Move blocks/deletions
        document.getElementById("sstats-left").appendChild(document.getElementById("user-has-rights"));
    }
    // End temp code
});

// Begin socket events
socketio.on("deleted", (user, wiki) => {
    if (user === selectedUser && wiki === selectedWiki) {
        document.querySelector(".error-code").innerHTML = "Error #503";
        document.querySelector(".error-title").innerHTML = `"${selectedUser}" is invalid!`;
        document.querySelector(".error-message").innerHTML = `
        Due to privacy concerns, Wiki Stats does not show data for deleted accounts.<br>
        If you believe this is an error, please <a href="/about">contact us</a>.<br><br>
        <div class="error-goback">
            <a href="/wiki/${selectedWiki}">Go home...</a>
        </div>`;

        showPage(false, true);
    }
});

socketio.on("notfound", (user, wiki) => {
    if (user === selectedUser && wiki === selectedWiki) {
        showPage(false, true);
    }
});

socketio.on("noedits", (user, wiki) => {
    if (user === selectedUser && wiki === selectedWiki) {
        document.querySelector(".error-title").innerHTML = `"${selectedUser}" has no edits!`;

        const caseNote = document.querySelector(".case-note");
        if (caseNote) {
            caseNote.style.display = "none";
        }

        document.querySelector(".error-message").classList.add("hidden");
        showPage(false, true);
    }
});

socketio.on("update", (user, wiki) => {
    if (user === selectedUser && wiki === selectedWiki) {
        document.getElementById("updating").classList.remove("hidden");
        updating = true;
    }
});

socketio.on("disconnect", (message) => {
    for (const element of document.getElementsByClassName("lost-connection")) {
        element.style.display = "inline";
    }

    for (const element of document.getElementsByClassName("lost-connection-update")) {
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

    for (const element of document.getElementsByClassName("lost-connection")) {
        element.style.display = "none";
    }
});

socketio.on(userString, (message) => {
    document.getElementById("updating").classList.add("hidden");
    const data = message;

    if (data.uTotalEdits === 0) {
        showPage(false, true);
        return;
    }

    for (const e of document.getElementsByClassName("user-url")) {
        e.href = `${data.wLinks}User:${encodeURIComponent(selectedUser)}`;
        for (const i in data.uClass) {
            e.classList.add(data.uClass[i]);
        }
    }

    if (data.uIsExpensive) {
        document.getElementById("bot-note").classList.remove("hidden");
    }

    // FIXME: Spaghetti fix, fix scripts/processUserData L306 instead
    if (data.uRegistration !== "Invalid date") {
        document.getElementById("user-registration").innerText = data.uRegistration;
        let registratiofromnow;
        if (data.uRegistrationFromNowDays === 1) {
            registratiofromnow = `${data.uRegistrationFromNowDays.toString()} day ago`;
        } else {
            registratiofromnow = `${data.uRegistrationFromNowDays.toString()} days ago`;
        }

        document.getElementById("user-registration-from-now").setAttribute("title", registratiofromnow);
        document.getElementById("user-registration-from-now").innerText = data.uRegistrationFromNow;
    } else {
        document.getElementById("user-registration-full").style.display = "none";
        document.getElementById("sstat-avgalltime").style.display = "none";
    }

    document.getElementById("user-total-edits").setAttribute("href", data.wSpecialContributions);
    document.getElementById("user-total-edits").innerText = data.uTotalEdits;

    document.getElementById("user-total-edits-mediawiki").innerText = data.uTotalEditsMediaWiki;

    document.getElementById("user-total-edits-minus-creations").innerText = `(Edits: ${data.uTotalEditsMinusCreations.toString()})`;

    document.getElementById("user-minor-edits").innerText = data.uMinorEdits;

    document.getElementById("user-pages-created").setAttribute("href", `${data.wSpecialContributions}&newOnly=1&namespace=6&nsInvert=1`);
    document.getElementById("user-pages-created").innerText = data.uPagesCreated;

    document.getElementById("user-uploads-plus-new-versions").setAttribute("href", data.wFiles);
    document.getElementById("user-uploads-plus-new-versions").innerText = data.uUploadsPlusNewVersions;

    document.getElementById("user-uploads").innerText = `(Creations: ${data.uUploads})`;

    document.getElementById("user-block-count").innerText = data.uBlockCount;
    document.getElementById("user-delete-count").innerText = data.uDeleteCount;

    if (data.wThanks) {
        document.getElementById("wiki-has-thanks").removeAttribute("class");
        document.getElementById("user-thanks-given").innerText = data.uThanksGiven;
        document.getElementById("user-thanks-received").innerText = data.uThanksReceived;
    }

    if (data.uHasRights) {
        document.getElementById("user-has-rights").removeAttribute("class");
    }

    const topPages = document.getElementById("user-top-pages");
    topPages.innerHTML = "";
    if (data.uTopPages.length > 1) {
        topPages.appendChild(document.createElement("br"));
        document.getElementById("plural").innerText = "s";

        for (let i = 0; i < Math.min(2, data.uTopPages.length); i += 1) {
            const topPage = data.uTopPages[i];
            const topPageLink = document.createElement("a");
            topPageLink.setAttribute("href", data.wLinks + topPage);
            topPageLink.setAttribute("class", "stats-offset-right");
            topPageLink.innerText = topPage;
            topPages.appendChild(topPageLink);
            topPages.appendChild(document.createElement("br"));
        }

        if (data.uTopPagesRemainder) {
            const moreTopPagesSpan = document.createElement("span");
            moreTopPagesSpan.setAttribute("class", "top-page top-margin more");
            moreTopPagesSpan.innerText = `...and ${data.uTopPagesRemainder} more!`;
            topPages.appendChild(moreTopPagesSpan);
            topPages.appendChild(document.createElement("br"));
        }

        const topPageEditCount = document.createElement("span");
        topPageEditCount.setAttribute("class", "stats-offset-right");

        const editsPlural = data.uTopPageCount > 1 ? " edits " : " edit ";
        topPageEditCount.innerText = `(${data.uTopPageCount.toString()}${editsPlural}each)`;
        topPages.appendChild(topPageEditCount);
    } else if (data.uTopPages.length !== 0) {
        document.getElementById("plural").innerText = "";
        const topPageLink = document.createElement("a");
        topPageLink.setAttribute("href", data.wLinks + encodeURIComponent(data.uTopPages[0]));
        topPageLink.setAttribute("class", "top-page first");
        topPageLink.innerText = data.uTopPages[0];
        topPages.appendChild(topPageLink);

        const topPageEditCount = document.createElement("span");
        topPageEditCount.innerText = ` (${data.uTopPageCount.toString()} edits)`;
        topPages.appendChild(topPageEditCount);
    } else {
        document.getElementById("user-top-pages-area").classList.add("hidden");
    }

    const bytes = document.getElementById("user-bytes");
    bytes.innerText = convertBytes(data.uBytes);
    bytes.title = `${data.uBytes} bytes`;

    const bytesavg = document.getElementById("user-bytesavg");
    // aqui o "utils.formatNumber()" do processUserData meio que é um tiro no próprio pé

    const avg = data.uBytesBalance / parseFloat(data.uTotalEdits.replace(",", ""));
    bytesavg.innerText = data.uBytesBalance > 0 ? `+${convertBytes(avg)}` : convertBytes(avg);
    bytesavg.title = `${avg.toFixed(2)} bytes`;

    const balance = document.getElementById("user-bytes-balance");
    balance.innerText = data.uBytesBalance > 0 ? `+${convertBytes(data.uBytesBalance)}` : convertBytes(data.uBytesBalance);
    balance.title = `${data.uBytesBalance} bytes`;

    if (data.uBiggestEdit.size) {
        const biggestEditLink = document.getElementById("user-biggest-edit");

        biggestEditLink.setAttribute("href", data.uBiggestEdit.link);
        biggestEditLink.innerText = data.uBiggestEdit.title;

        const biggestEditSize = document.getElementById("user-biggest-edit-size");
        biggestEditSize.innerText = convertBytes(data.uBiggestEdit.size);
        biggestEditSize.title = `${data.uBiggestEdit.size} bytes`;

        if (data.uBiggestEditNs0.size && data.uBiggestEditNs0.title !== data.uBiggestEdit.title) {
            const biggestEditNs0Link = document.getElementById("user-biggest-editns0-link");

            biggestEditNs0Link.setAttribute("href", data.uBiggestEditNs0.link);
            biggestEditNs0Link.innerText = data.uBiggestEditNs0.title;

            const biggestEditNs0Size = document.getElementById("user-biggest-editns0-size");
            biggestEditNs0Size.innerText = convertBytes(data.uBiggestEditNs0.size);
            biggestEditNs0Size.title = `${data.uBiggestEditNs0.size} bytes`;
        } else {
            document.getElementById("user-biggest-editns0").classList.add("hidden");
        }
    } else {
        document.getElementById("user-biggest-edit-p").classList.add("hidden");
    }

    document.getElementById("user-most-edits-in-a-single-day").innerText = data.uSingleDayOverall;

    document.getElementById("user-most-edits-date").setAttribute("title", `Achieved on ${data.uSingleDayOverallDateTip}`);
    document.getElementById("user-most-edits-date").innerText = `(${data.uSingleDayOverallDate})`;

    document.getElementById("user-unique-pages").innerText = data.uPagesEdited;

    const formatStreak = s => formatDate(new Date(s));

    if (data.uStreakCurrent.start) {
        document.getElementById("user-streak-count-current-b").setAttribute("title", `Since ${formatStreak(data.uStreakCurrent.start)}`);
        document.getElementById("user-streak-count-current-b").setAttribute("class", "tooltip");
    }

    document.getElementById("user-streak-count-current").innerText = data.uStreakCountCurrent;

    const currentStreakPlural = document.getElementById("user-streak-current-plural");

    if (data.uStreakCountCurrent === "1") {
        currentStreakPlural.innerText = "";
    } else {
        currentStreakPlural.innerText = "s";
    }

    if (data.uStreak.start) {
        if (data.uStreak.start === data.uStreakCurrent.start &&
            data.uStreak.end === data.uStreakCurrent.end) {
            document.getElementById("user-streak-count-b").setAttribute("title", `Since ${formatStreak(data.uStreak.start)}`);
        } else {
            document.getElementById("user-streak-count-b").setAttribute("title", `${formatStreak(data.uStreak.start)} - ${formatStreak(data.uStreak.end)}`);
        }

        document.getElementById("user-streak-count-b").setAttribute("class", "tooltip");
    }

    document.getElementById("user-streak-count").innerText = data.uStreakCount;

    const streakPlural = document.getElementById("user-streak-plural");

    if (data.uStreakCount === "1") {
        streakPlural.innerText = "";
    } else {
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
    languageEdits = data.uLanguages;

    loading = false;
    updating = false;

    // Load ws achievement data
    getAchievementData(data.uAchievements);

    showPage(false);
});

// End socket events

// Begin utils
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

const formatStringToID = (string, prefix = "") => {
    return prefix + string.toLowerCase().replace(/\W/g, "_");
};

function cleanUserName(name) {
    let nameClean = name.trim();
    nameClean = nameClean.charAt(0).toUpperCase() + nameClean.slice(1);

    if (name !== nameClean) {
        if (history.pushState) {
            const url = `${windowProtocol}//${windowHost}/user/${selectedWiki}/${nameClean}`;
            window.history.pushState({
                path: url
            }, "", url);
        } else {
            window.location.href = `${windowProtocol}//${windowHost}/user/${selectedWiki}/${nameClean}`;
        }
    }

    return nameClean;
}

// End utils

// Begin functions

function getFirstIndex(array) {
    let element = -1;
    array.some((value, index) => {
        if (value) {
            element = index;
            return true;
        }
    });

    if (element === -1) {
        throw new Error("All the elements in this array are falsy");
    }

    return element;
}

function convertBytes(bytes) {
    if (bytes >= Math.pow(1024, 3)) {
        return `${(bytes / Math.pow(1024, 3)).toFixed(2)} GB`;
    }
    if (bytes >= Math.pow(1024, 2)) {
        return `${(bytes / Math.pow(1024, 2)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} kB`;
}

function selectTab(tab = "info") {
    for (const e of document.getElementsByClassName("tab-content")) {
        e.style.display = "none";
    }

    const tabSelected = tab;

    if (tabSelected === "graphs" && !graphsLoaded) {
        loadCharts();
    }

    document.querySelector(".tab-selected").classList.remove("tab-selected");
    document.getElementById(`tab-${tabSelected}`).classList.add("tab-selected");
    document.getElementById(tabSelected).style.display = "block";
}

function getAchievements(callback) {
    const req = new XMLHttpRequest();
    req.onreadystatechange = () => {
        if (req.readyState === 4) {
            if (req.status === 200) {
                const json = JSON.parse(req.responseText);
                callback(json);
            } else {
                console.error(`Error getting achievements: ${req.responseText}`);
            }
        }
    };

    req.open("GET", `${windowProtocol}//${windowHost}/action/getAchievements`, true);
    req.send();
}

function getAchievementData(achievements) {
    const grid = document.getElementById("achievement-grid");
    grid.innerHTML = "";

    const loading = document.getElementById("achievement-loading");

    if (achievements.length !== 0) {
        const achievementData = [];

        for (const achievement of achievements) {
            const sep = achievement.lastIndexOf("-");
            const name = achievement.substr(0, sep);
            const lvl = achievement.substr(sep + 1, achievement.length);

            achievementData.push([name, lvl]);
        }

        getAchievements((json) => {
            const achievementsDesc = json.achievements;

            for (const data of achievementData) {
                const achievement = achievementsDesc.find((x) => x.id === data[0]);
                const name = achievement.name;
                const icon = achievement.icon;
                const description = achievement.description.replace("%s", formatNumber(achievement[data[1]]));

                if (!grid.querySelector(formatStringToID(name, "#wsachievement-"))) {
                    grid.appendChild(addAchievement(name, description, icon, data[1]));
                }
            }

            loading.classList.add("hidden");
            document.getElementById("achievements-count").textContent = `(${grid.children.length})`;
        });
    } else {
        document.getElementById("tab-achievements").style = "display: none";
        loading.innerHTML = "No achievements unlocked yet!";
    }
}

function addAchievement(name, description, image, lvl) {
    const level = selectedWiki === "tf" && lvl === "platinum" ? "australium" : lvl;
    const title = document.createElement("b");
    const details = document.createElement("div");
    const icon = document.createElement("img");
    const achievement = document.createElement("div");
    const desc = document.createElement("span");

    achievement.classList.add("listing");
    achievement.id = formatStringToID(name, "wsachievement-");

    icon.src = image;
    icon.classList.add("icon", `${level || "platinum"}`);

    details.classList.add("details");
    title.innerText = `${name} [${level.charAt(0).toUpperCase() + level.substr(1, level.length)}]`;
    title.style.float = "left";

    desc.innerText = description;
    title.style.float = "left";

    details.append(title, document.createElement("br"), desc);
    achievement.append(icon, details);

    return achievement;
}

// TODO: Rewrite
function showPage(isPartial = false, isNotFound = false) {
    if (!isNotFound) {
        document.getElementById("error").style.display = "none";
        document.getElementById("preloader").style.display = "block";
        document.getElementById("preloader").classList.remove("partial");

        if (!isPartial) {
            document.getElementById("tab-select").style.display = "block";
            document.getElementById("preloader").style.display = "none";

            if (!document.querySelector(".tab-selected")) {
                document.getElementById("tab-stats").classList.add("tab-selected");
                document.getElementById("tab-select").classList.remove("hidden");
                selectTab();
            }
        } else {
            document.getElementById("info").style.display = "block";
        }
    } else {
        document.getElementById("error").style.display = "block";
        document.getElementById("preloader").style.display = "none";
    }
}

// End functions

// Begin gCharts

function loadCharts() {
    tabsActive = false;
    google.charts.load("current", {
        packages: ["corechart"]
    });
    google.charts.setOnLoadCallback(drawCharts);
}

function drawCharts() {
    drawYearSelection();
    drawNamespacesChart();
    drawHourChart();
    drawWeekChart();
    drawDaySelection();
    drawMonthChart();
    drawYearChart();
    drawLanguageChart();
    graphsLoaded = true;
    tabsActive = true;
}

function calculateChartTicks(maxValue) {
    const ticks = [];

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
    "Sept", "Oct", "Nov", "Dec"
];

const fullMonths = ["January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
];

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

    document.getElementById(`year${selectedYear}`).setAttribute("class", "selected-year");

    selectYear(selectedYear);
}

function drawYearSelector(n) {
    const yearSelector = document.createElement("span");

    yearSelector.setAttribute("id", `year${n}`);
    yearSelector.setAttribute("onClick", `selectYear(${n})`);
    yearSelector.innerText = new Date().getUTCFullYear() - n;

    document.getElementById("timeline-select-year").appendChild(yearSelector);
}

function selectYear(year) {
    const monthSelection = document.getElementById("timeline-select-month");
    monthSelection.innerHTML = "";

    const overallViewSpan = document.createElement("span");
    overallViewSpan.setAttribute("id", "month-overall");
    overallViewSpan.setAttribute("onClick", `drawOverallTimelineChart(${year})`);
    overallViewSpan.innerText = "Overview";
    monthSelection.appendChild(overallViewSpan);

    for (let i = 0; i < contributionsByYearAndMonth[year].length; i += 1) {
        if (contributionsByYearAndMonth[year][i]) {
            drawMonthSelector(i);
        }
    }

    selectedYear = year;

    document.querySelector(".selected-year").removeAttribute("class");
    document.getElementById(`year${year}`).setAttribute("class", "selected-year");

    if (selectedMonth !== undefined && selectedMonth !== null &&
        !contributionsByYearAndMonth[year][selectedMonth]) {
        selectedMonth = null;
    }

    if (selectedMonth === undefined || selectedMonth === null) {
        overallViewSpan.setAttribute("class", "selected-month");
        drawOverallTimelineChart(year);
    } else {
        document.getElementById(`month${selectedMonth}`).setAttribute("class", "selected-month");
        drawMonthTimelineChart(selectedMonth);
    }
}

function drawMonthSelector(monthNumber) {
    const monthSelector = document.createElement("span");

    monthSelector.setAttribute("id", `month${monthNumber}`);
    monthSelector.setAttribute("onClick", `drawMonthTimelineChart(${monthNumber})`);
    monthSelector.innerText = fullMonths[monthNumber];

    document.getElementById("timeline-select-month").appendChild(monthSelector);
}

function buildTooltip(top, bottomLabel, bottomNumber) {
    const ul = document.createElement("ul");
    ul.setAttribute("class", "google-visualization-tooltip-item-list");
    ul.style = "";

    const topItemli = document.createElement("li");
    topItemli.setAttribute("class", "google-visualization-tooltip-item");
    topItemli.style = "";

    const topItemContent = document.createElement("span");
    topItemContent.style = "font-family: Arial; font-size: 12px; color: rgb(0, 0, 0); opacity: 1; margin: 0px; text-decoration: none; font-weight: bold;";
    topItemContent.innerText = top;

    topItemli.appendChild(topItemContent);
    ul.appendChild(topItemli);

    const bottomItemli = document.createElement("li");
    bottomItemli.setAttribute("class", "google-visualization-tooltip-item");
    bottomItemli.style = "";

    const bottomItemLabel = document.createElement("span");
    bottomItemLabel.style = "font-family: Arial; font-size: 12px; color: rgb(0, 0, 0); opacity: 1; margin: 0px; text-decoration: none;";

    const bottomItemNumber = document.createElement("span");
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
    const chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Month");
    chartData.addColumn("number", "Edits");
    chartData.addColumn({
        type: "string",
        role: "tooltip",
        p: {
            html: true
        }
    });

    const monthEdits = contributionsByYearAndMonth[year];

    for (let i = 0; i < 12; i += 1) {
        const tooltipText = buildTooltip(`${fullMonths[i]} ${new Date().getUTCFullYear() - selectedYear}`,
            "Edits:", formatNumber(monthEdits[i]));
        chartData.addRow([months[i], monthEdits[i], tooltipText]);
    }

    const vAxisTicks = calculateChartTicks(Math.max(...monthEdits));

    const chartOptions = {
        tooltip: {
            trigger: "both",
            isHtml: true,
            ignoreBounds: false
        },
        vAxis: {
            title: "Edits",
            minValue: 0,
            ticks: vAxisTicks
        },
        legend: {
            position: "none"
        },
        colors: ["rgb(179, 82, 21)"],
        backgroundColor: "transparent",
        chartArea: {
            top: 30
        },
        width: "100%",
        height: 400
    };

    const chart = new google.visualization.ColumnChart(document.getElementById("edits-timeline"));
    chart.draw(chartData, chartOptions);

    selectedMonth = null;
    document.querySelector(".selected-month").removeAttribute("class");
    document.getElementById("month-overall").setAttribute("class", "selected-month");
}

function drawMonthTimelineChart(month) {
    const chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Date");
    chartData.addColumn("number", "Edits");
    chartData.addColumn({
        type: "string",
        role: "tooltip",
        p: {
            html: true
        }
    });

    const year = contributionsByDay[selectedYear][month];

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
        tooltip: {
            trigger: "both",
            isHtml: true,
            ignoreBounds: false
        },
        legend: {
            position: "none"
        },
        hAxis: {
            textStyle: {
                fontSize: fontSize
            }
        },
        vAxis: {
            title: "Edits",
            minValue: 0,
            ticks: vAxisTicks
        },
        colors: ["rgb(179, 82, 21)"],
        backgroundColor: "transparent",
        width: "100%",
        height: 400
    };

    const chart = new google.visualization.LineChart(document.getElementById("edits-timeline"));
    chart.draw(chartData, chartOptions);

    selectedMonth = month;
    document.querySelector(".selected-month").removeAttribute("class");
    document.getElementById(`month${month}`).setAttribute("class", "selected-month");
}

function drawNamespacesChart() {
    const chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Namespace");
    chartData.addColumn("number", "Edits");

    if (namespaceEdits) {
        const namespaceTuples = [];
        for (const namespace in namespaceEdits) {
            namespaceTuples.push([namespace, namespaceEdits[namespace]]);
        }
        namespaceTuples.sort((a, b) => b[1] - a[1]);

        chartData.addRows(namespaceTuples);

        const chartOptions = {
            tooltip: {
                trigger: "both",
                isHtml: true,
                ignoreBounds: false
            },
            backgroundColor: "transparent",
            sliceVisibilityThreshold: 0,
            width: "100%",
            height: 400
        };

        const chart = new google.visualization.PieChart(document.getElementById("edits-byns"));
        chart.draw(chartData, chartOptions);
    }
}

const hoursFull = [
    "00:00", "1:00", "2:00", "3:00", "4:00",
    "5:00", "6:00", "7:00", "8:00", "9:00",
    "10:00", "11:00", "12:00", "13:00", "14:00",
    "15:00", "16:00", "17:00", "18:00", "19:00",
    "20:00", "21:00", "22:00", "23:00"
];

function drawHourChart() {
    const chartData = new google.visualization.DataTable();
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
        [hoursFull[23], contributionsByHour[23]]
    ]);

    const vAxisTicks = calculateChartTicks(Math.max(...contributionsByHour));

    const chartOptions = {
        tooltip: {
            trigger: "both",
            isHtml: true,
            ignoreBounds: false
        },
        vAxis: {
            title: "Edits",
            minValue: 0,
            ticks: vAxisTicks
        },
        legend: {
            position: "none"
        },
        colors: ["rgb(179, 82, 21)"],
        chartArea: {
            top: 30
        },
        backgroundColor: "transparent",
        width: "50%",
        height: 300
    };

    const chart = new google.visualization.ColumnChart(document.getElementById("edits-hours"));
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
    const chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Hour");
    chartData.addColumn("number", "Edits");
    chartData.addColumn({
        type: "string",
        role: "tooltip",
        p: {
            html: true
        }
    });

    for (let i = 0; i < 7; i += 1) {
        const tooltipText = buildTooltip(fullDays[i],
            "Edits:", formatNumber(contributionsByWeekDay[i]));
        chartData.addRow([weekDays[i], contributionsByWeekDay[i], tooltipText]);
    }

    const vAxisTicks = calculateChartTicks(Math.max(...contributionsByWeekDay));

    const chartOptions = {
        tooltip: {
            trigger: "both",
            isHtml: true,
            ignoreBounds: false
        },
        vAxis: {
            title: "Edits",
            minValue: 0,
            ticks: vAxisTicks
        },
        legend: {
            position: "none"
        },
        colors: ["rgb(179, 82, 21)"],
        chartArea: {
            top: 30
        },
        backgroundColor: "transparent",
        width: "50%",
        height: 300
    };

    const chart = new google.visualization.ColumnChart(document.getElementById("edits-week"));
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
        selectedDay = new Date().getUTCDay();
        if (!contributionsByWeekDay[selectedDay]) {
            selectedDay = getFirstIndex(contributionsByWeekDay);
        }
    }

    document.getElementById(`day${selectedDay}`).setAttribute("class", "selected-week");
    drawWeekAndHourChart(selectedDay);
}

function drawDaySelector(d) {
    const selector = document.createElement("span");

    selector.setAttribute("onclick", `drawWeekAndHourChart(${d})`);
    selector.setAttribute("id", `day${d}`);
    selector.innerText = fullDays[d];

    document.getElementById("week-hour-select").appendChild(selector);
}

function drawWeekAndHourChart(day) {
    const hourEdits = contributionsByWeekAndHour[day];

    const chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Hour");
    chartData.addColumn("number", "Edits");

    for (let i = 0; i < 24; i += 1) {
        chartData.addRow([hoursFull[i], hourEdits[i]]);
    }

    const vAxisTicks = calculateChartTicks(Math.max(...hourEdits));

    const chartOptions = {
        tooltip: {
            trigger: "both",
            isHtml: true,
            ignoreBounds: false
        },
        vAxis: {
            title: "Edits",
            viewWindowMode: "explicit",
            viewWindow: {
                min: 0
            },
            minValue: 0,
            ticks: vAxisTicks
        },
        legend: {
            position: "none"
        },
        colors: ["rgb(179, 82, 21)"],
        backgroundColor: "transparent",
        height: 300,
        chartArea: {
            top: 30
        }
    };

    const chart = new google.visualization.ColumnChart(document.getElementById("edits-wh"));
    chart.draw(chartData, chartOptions);

    document.querySelector(".selected-week").removeAttribute("class");
    document.getElementById(`day${day}`).setAttribute("class", "selected-week");
}

function drawMonthChart() {
    const chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Month");
    chartData.addColumn("number", "Edits");
    chartData.addColumn({
        type: "string",
        role: "tooltip",
        p: {
            html: true
        }
    });

    for (let i = 0; i < 12; i += 1) {
        const tooltipText = buildTooltip(fullMonths[i],
            "Edits:", formatNumber(contributionsByMonth[i]));
        chartData.addRow([months[i], contributionsByMonth[i], tooltipText]);
    }

    const vAxisTicks = calculateChartTicks(Math.max(...contributionsByMonth));

    const chartOptions = {
        tooltip: {
            trigger: "both",
            isHtml: true,
            ignoreBounds: false
        },
        vAxis: {
            title: "Edits",
            minValue: 0,
            ticks: vAxisTicks
        },
        legend: {
            position: "none"
        },
        colors: ["rgb(179, 82, 21)"],
        backgroundColor: "transparent",
        chartArea: {
            top: 30
        },
        width: "50%",
        height: 300
    };

    const chart = new google.visualization.ColumnChart(document.getElementById("edits-month"));
    chart.draw(chartData, chartOptions);
}

function drawYearChart() {
    const chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Year");
    chartData.addColumn("number", "Edits");

    const activeYears = contributionsByYear.slice(0);

    let emptyYears = 0;

    while (activeYears[0] === undefined || activeYears[0] === null) {
        activeYears.shift();
        emptyYears += 1;
    }

    const currentYear = new Date().getUTCFullYear();

    for (let i = activeYears.length - 1; i >= 0; i -= 1) {
        let editsThisYear = 0;

        if (activeYears[i]) {
            editsThisYear = activeYears[i];
        }

        chartData.addRow([(currentYear - i - emptyYears).toString(), editsThisYear]);
    }

    const vAxisTicks = calculateChartTicks(Math.max(...contributionsByYear));

    const chartOptions = {
        tooltip: {
            trigger: "both",
            isHtml: true,
            ignoreBounds: false
        },
        vAxis: {
            title: "Edits",
            viewWindowMode: "explicit",
            viewWindow: {
                min: 0
            },
            minValue: 0,
            ticks: vAxisTicks
        },
        legend: {
            position: "none"
        },
        colors: ["rgb(179, 82, 21)"],
        backgroundColor: "transparent",
        chartArea: {
            top: 30
        },
        width: "50%",
        height: 300
    };

    const chart = new google.visualization.LineChart(document.getElementById("edits-year"));
    chart.draw(chartData, chartOptions);
}

function drawLanguageChart() {
    const chartData = new google.visualization.DataTable();
    chartData.addColumn("string", "Language");
    chartData.addColumn("number", "Edits");

    // FIXME: scripts/updateUser.js does not verify for valid languages codes (ISO639-1),
    // languageEdits should not be trusted
    // if (languageEdits) {
    if (["tf", "portal"].includes(selectedWiki)) {
        const languageTuples = [];
        const languangeNames = {
            ar: "Arabic",
            "pt-br": "Portuguese (Brazil)",
            bg: "Bulgarian",
            cs: "Czech",
            da: "Danish",
            nl: "Dutch",
            en: "English",
            fi: "Finnish",
            fr: "French",
            de: "German",
            hu: "Hungarian",
            it: "Italian",
            ja: "Japanese",
            ko: "Korean",
            no: "Norwegian",
            pl: "Polish",
            pt: "Portuguese (Portugal)",
            ro: "Romanian",
            ru: "Russian",
            "zh-hans": "Chinese (Simplified)",
            es: "Spanish (Spain)",
            sv: "Swedish",
            "zh-hant": "Chinese (Traditional)",
            th: "Thai",
            tr: "Turkish",
            uk: "Ukrainian",
            vi: "Vietnamese"
        };

        for (const language in languageEdits) {
            languageTuples.push([languangeNames[language], languageEdits[language]]);
        }

        languageTuples.sort((a, b) => b[1] - a[1]);

        chartData.addRows(languageTuples);

        const chartOptions = {
            tooltip: {
                trigger: "both",
                isHtml: true,
                ignoreBounds: false
            },
            backgroundColor: "transparent",
            sliceVisibilityThreshold: 0,
            width: "100%",
            height: 400
        };

        const chart = new google.visualization.PieChart(document.getElementById("edits-bylang"));
        chart.draw(chartData, chartOptions);
    } else {
        document.getElementById("wmultilanguagesupport").style.display = "none";
    }
}

// End gCharts
