/** ** (c) Espacorede Project ** **/

window.addEventListener("load", () => {
    // don't look at me, it works
    getTop10("editors", () => {
        getTop10("uploaders", () => {
            document.getElementById("top10").style.display = "block";
        });
    });
});

function getTop10(list, _cb) {
    const request = new XMLHttpRequest();
    request.open("GET", `${window.location}/data/top10${list}`, true);

    request.onload = function () {
        if (request.status === 200) {
            const users = JSON.parse(request.responseText).users;

            users.forEach(user => {
                const table = document.getElementById(`table-${list}`).getElementsByTagName("tbody")[0];

                const userRow = table.insertRow();
                const userCell = userRow.insertCell(0);
                const dataCell = userRow.insertCell(1);

                const userLink = document.createElement("a");
                userLink.href = `${windowProtocol}//${windowHost}/user/${selectedWiki}/${user.name}`;
                userLink.innerText = user.name;
                userLink.className = user.class;

                const userData = document.createTextNode(list === "editors" ? (user.edits) : user.uploads);

                userCell.appendChild(userLink);
                dataCell.appendChild(userData);

                const userDataPerDay = document.createElement("small");
                userDataPerDay.textContent = ` (${list === "editors" ? (user.editsPerDay) : user.uploadsPerDay} per day)`;
                dataCell.appendChild(userDataPerDay);
            });

            if (JSON.parse(request.responseText).total.users === 0) {
                document.getElementById(`table-${list}`).style.display = "none";
            }

            _cb();
        } else {
            console.log("Failed to load top users data!");
        }
    };

    request.onerror = function () {
        console.log("Failed to request top users data!");
    };

    request.send();
}
