/** ** (c) Espacorede Project ** **/

window.addEventListener("load", () => {
    getDropdownYears();
    getLists();
    highlightMonth();

    document.getElementById("avail-years").addEventListener("change", function () {
        changeYear(this.value);
    });
});

const startYear = 2019;
const currentMonth = new Date().getUTCMonth();
let currentYear = new Date().getFullYear();

function getLists(year = currentYear) {
    if (year <= startYear) {
        document.getElementById("alert").innerHTML = "<b>Notice</b>: Some data for this time period is unavailable due to MediaWiki limitations.";
    } else if (currentMonth === 0) {
        document.getElementById("alert").innerHTML = "<b>Notice</b>: Data for January is not yet available. Please check back later.";
    } else {
        document.getElementById("alert").innerHTML = "";
    }

    const request = new XMLHttpRequest();
    request.open("GET", `${window.location}/available?year=${year}`, true);

    request.onload = function () {
        if (request.status >= 200 && request.status < 400) {
            const lists = JSON.parse(request.responseText).lists;

            lists.forEach(list => {
                document.getElementById(`link-top-${list.month}`).innerHTML = `
                    <a href="${windowProtocol}//${windowHost}/wiki/${selectedWiki}/top/${currentYear}/${list.month}">
                        <button class="btn btn--small">
                            View
                        </button>
                    </a>`;

                document.getElementById(`link-top-${list.month}`).classList.remove("nodata");
            });
        } else {
            document.getElementById("alert").innerHTML = "<b>Error</b>: Failed to request data. This is a server problem, please report.";
        }
    };

    request.onerror = function () {
        document.getElementById("alert").innerHTML = "<b>Error</b>: Failed to request data.";
    };

    request.send();
}

function changeYear(year = currentYear) {
    currentYear = year;

    document.querySelectorAll(".top-year").forEach(function (el) {
        el.textContent = year;
    });

    document.querySelectorAll(".top-list-status").forEach(function (el) {
        el.innerHTML = `
        <button class="btn btn--small" disabled>
            No data
        </button>`;

        el.classList.add("nodata");
    });

    getLists(year);
    highlightMonth();
}

function highlightMonth(month = currentMonth - 1) {
    if (month !== -1 && parseInt(currentYear) === new Date().getUTCFullYear()) {
        document.getElementById(`month-${month}`).innerHTML = `${document.getElementById(`month-${month}`).textContent}<span id="megaphone" title="Last month" class="icon-megaphone"></span>`;
    } else {
        if (document.getElementsByClassName("icon-megaphone")[0]) {
            document.getElementsByClassName("icon-megaphone")[0].remove();
        }
    }
}

function getDropdownYears() {
    let start = 2019; // hardcoded WikiStats release
    const dropdown = document.getElementById("avail-years");

    while (new Date().getFullYear() >= start) {
        const option = document.createElement("option");
        option.text = start;
        option.value = start;
        dropdown.add(option);
        start++;
    }
}
