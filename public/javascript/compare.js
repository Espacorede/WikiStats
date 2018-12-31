/** * (c) Espacorede Project * **/

let numberOfDots = 1;
setInterval(() => {
    numberOfDots = (++numberOfDots % 5) || 1;
    for (let element of document.getElementsByClassName("dots")) {
        element.innerText = Array(numberOfDots).join(".");
    }
}, 500);

const mainUser = decodeURI(window.location.pathname.split("/")[3]);
const comparedUser = new URL(window.location.href).searchParams.get("user");

let loadingMainUser = true;
let loadingComparedUser = true;
let updatingMainUser = false;
let updatingComparedUser = false;

const socketio = io();

function verifyIfLoading() {
    if (loadingMainUser || updatingMainUser) {
        socketio.emit("load", mainUser, selectedWiki);
    }

    if (loadingComparedUser || updatingComparedUser) {
        socketio.emit("load", comparedUser, selectedWiki);
    }
}

window.onload = () => {
    document.getElementById("userBig").addEventListener("keyup", (listener) => {
        listener.preventDefault();

        if (listener.keyCode === 13) {
            if (document.getElementById("userBig").value) {
                searchUser("userBig");
            }
        }
    });

    console.log("Requesting data from server...");
    socketio.emit("load", mainUser, selectedWiki);
    socketio.emit("load", comparedUser, selectedWiki);

    setInterval(verifyIfLoading, 60000);
};

socketio.on("update", (user, wiki) => {
    if (user === mainUser && wiki === selectedWiki) {
        console.log(`User ${user} found and updating!`);
        document.getElementById("main-updating").removeAttribute("class");
        updatingMainUser = true;
    }

    if (user === comparedUser && wiki === selectedWiki) {
        console.log(`User ${user} found and updating!`);
        document.getElementById("target-updating").removeAttribute("class");
        updatingComparedUser = true;
    }
});

socketio.on("disconnect", (message) => {
    for (let element of document.getElementsByClassName("lost-conn")) {
        element.innerText = "Connection lost! Reconnecting...";
    }

    if (message === "io server disconnect") {
        socketio.connect();
    }
});

socketio.on("reconnect", () => {
    verifyIfLoading();

    for (let element of document.getElementsByClassName("lost-conn")) {
        element.innerText = "";
    }
});


function updateUser(main, data) {
    const whichUser = main ? "main" : "target";
    const userName = data.uName;

    // Header link "Comparing X to Y"
    document.getElementById(`${whichUser}-url`).setAttribute("href", "../" + userName);

    // Total contributions, creations and uploads
    let contribs = document.getElementById(`${whichUser}-contribs`);
    contribs.setAttribute("href", data.wSpecialContributions);
    contribs.innerText = data.uTotalEdits;

    document.getElementById(`${whichUser}-contribs-minus`).innerText = "(" + data.uTotalEditsMinusCreations.toString() + ")";
    document.getElementById(`${whichUser}-contribs-minus`).setAttribute("title", "Deducting page creations and file uploads");

    document.getElementById(`${whichUser}-minoredits`).innerText = data.uMinorEdits;

    let creations = document.getElementById(`${whichUser}-pagecreations`);
    creations.setAttribute("href", data.wSpecialContributions + "&newOnly=1&namespace=6&nsInvert=1");
    creations.innerText = data.uPagesCreated;

    let uploads = document.getElementById(`${whichUser}-uploads`);
    uploads.setAttribute("href", data.wFiles);
    uploads.innerText = data.uUploadsPlusNewVersions;

    // Unique pages
    document.getElementById(`${whichUser}-uniquepages`).innerText = data.uPagesEdited;

    // Single day overall
    document.getElementById(`${whichUser}-overall`).innerText = data.uSingleDayOverall;
    document.getElementById(`${whichUser}-overall`).setAttribute("class", `compare-${whichUser} tooltip`);
    document.getElementById(`${whichUser}-overall`).setAttribute("title", "Achieved on " + data.uSingleDayOverallDateTip);

    // Edit streak
    const formatStreak = s => { 
        let date = new Date(s);
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
    }

    if (data.uStreakCurrent.start) {
        document.getElementById(`${whichUser}-streak-current-b`).setAttribute("title", "Since " + formatStreak(data.uStreakCurrent.start));
        document.getElementById(`${whichUser}-streak-current-b`).classList.add("tooltip");
    }

    document.getElementById(`${whichUser}-streak-current`).innerText = data.uStreakCountCurrent;

    let currentStreakPlural = document.getElementById(`${whichUser}-streak-current-plural`);
    if (data.uStreakCount === "1") {
        currentStreakPlural.innerText = "";
    }
    else {
        currentStreakPlural.innerText = "s";
    }

    if (data.uStreak.start) {
        if (data.uStreak.start === data.uStreakCurrent.start &&
            data.uStreak.end === data.uStreakCurrent.end) {
            document.getElementById(`${whichUser}-streak-longest-b`).setAttribute("title", "Since " + formatStreak(data.uStreak.start));
        }
        else {
            document.getElementById(`${whichUser}-streak-longest-b`).setAttribute("title", formatStreak(data.uStreak.start) + " - " + formatStreak(data.uStreak.end));
        }
        document.getElementById(`${whichUser}-streak-longest-b`).classList.add("tooltip");
    }

    let streakPlural = document.getElementById(`${whichUser}-streak-longest-plural`);
    if (data.uStreakCount === "1") {
        streakPlural.innerText = "";
    }
    else {
        streakPlural.innerText = "s";
    }

    document.getElementById(`${whichUser}-streak-longest`).innerText = data.uStreakCount;

    // Contributions numbers
    document.getElementById(`${whichUser}-edits-last30`).innerText = data.uEditsLast30;
    document.getElementById(`${whichUser}-edits-last7`).innerText = data.uEditsLast7;
    document.getElementById(`${whichUser}-edits-last-semester`).innerText = data.uEditsLast6Months;
    document.getElementById(`${whichUser}-edits-last-year`).innerText = data.uEditsLastYear;
    document.getElementById(`${whichUser}-edits-alltime`).innerText = data.uEditsAllTime;

    // End
    // Removing loading message
    document.getElementById(`${whichUser}-updating`).setAttribute("class", "hidden");

    if (main) {
        loadingMainUser = false;
        updatingMainUser = false;
    } else {
        loadingComparedUser = false;
        updatingComparedUser = false;
    }

    if (!loadingMainUser && !loadingComparedUser) {
        document.getElementById("compare-content").style.display = "block";
        document.getElementById("preloader").style.display = "none";
    }
}

socketio.on(mainUser, (message) => {
    console.log(`"Main" user (${message.uName}) received!`);
    updateUser(true, message, selectedWiki);
});

socketio.on(comparedUser, (message) => {
    console.log(`"Target" user (${message.uName}) received!`);
    updateUser(false, message, selectedWiki);
});