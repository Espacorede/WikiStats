/** ** (c) Espacorede Project ** **/

const windowProtocol = window.location.protocol; // TODO: REMOVE
const windowHost = window.location.host; // TODO: REMOVE
let selectedWiki = window.location.pathname.split("/")[2] ? window.location.pathname.split("/")[2] : "tf";
let userClaims;
// let hamburger;

document.addEventListener("DOMContentLoaded", () => {
    // Search bar
    const searchIds = [
        "user", // Legacy ?
        "homepage-user", // New homepage
        "userBig" // Global header
    ];

    for (const id in searchIds) {
        if (document.getElementById(searchIds[id])) {
            document.getElementById(searchIds[id]).addEventListener("keyup", (listener) => {
                listener.preventDefault();

                if (listener.keyCode === 13) {
                    if (document.getElementById(searchIds[id]).value) {
                        searchUser(searchIds[id]);
                    }
                }
            });
        }
    }

    // Dark mode preferences
    if (localStorage.getItem("dark11") === "1") {
        toggleDarkMode();
    }

    // Dark mode toggle
    document.getElementById("dark-mode-toggle").addEventListener("click", function () {
        toggleDarkMode(true);
    }, false);

    // Dark mode toggle - mobile
    // TODO: Remover isso quando o CSS novo terminar de ser implementado
    if (document.getElementById("dark-mode-toggle-mobile")) {
        document.getElementById("dark-mode-toggle-mobile").addEventListener("click", function () {
            toggleDarkMode(true);
        });
    }

    // Enable mobile hamburger
    if (document.querySelector(".mobile-hamburger")) {
        document.querySelector(".mobile-hamburger").addEventListener("click", function (e) {
            document.querySelector(".mobile-sidebar").classList.toggle("active");

            e.stopPropagation();
        });

        document.addEventListener("click", function () {
            if (document.querySelector(".mobile-sidebar").classList.contains("active")) {
                document.querySelector(".mobile-sidebar").classList.toggle("active");
            }
        });
    } else {
        console.error("Using legacy CSS. Starg pls fix.");
    }

    // Other functions
    getClaims();

    // Animal Crossing Wiki specific
    if (selectedWiki === "ac") {
        // Imported from Horae
        const acSeason = Math.floor((new Date().getUTCMonth() / 12 * 4)) % 4;

        console.log(`season is ${acSeason}`);

        if (acSeason === 3) {
            document.querySelector(".wlogo").src = "/images/wikis/logo-ac.png";
        } else if (acSeason === 0) {
            document.querySelector(".wlogo").src = "/images/wikis/logo-ac-winter.png";
        } else if (acSeason === 1) {
            document.querySelector(".wlogo").src = "/images/wikis/logo-ac-autumn.png";
        } else if (acSeason === 2) {
            document.querySelector(".wlogo").src = "/images/wikis/logo-ac-summer.png";
        } else {
            document.querySelector(".wlogo").src = "/images/wikis/logo-ac.png";
        }
    }
});

// Begin search
function searchUser(input) {
    let searchTerm = document.getElementById(input).value;

    const invalidCharacters = /[:#/?@]/g;
    searchTerm = searchTerm.replace(invalidCharacters, "");

    let user = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
    user = user.trim();

    if (user !== "") {
        if (history.pushState) {
            const url = `${windowProtocol}//${windowHost}/user/${selectedWiki}/${user}`;
            window.history.pushState({
                path: url
            }, "", url);
            location.reload();
        } else {
            window.location.href = `${windowProtocol}//${windowHost}/user/${selectedWiki}/${user}`;
            location.reload();
        }
    }
}
// End search

// Begin homepage/wikipage fluff
function logoSwitch(element) {
    element.classList.toggle("otfwlogoslow");
    element.classList.toggle("otfwlogofast");

    const logoGray = `${window.location.href}images/wikis/logo-tf.png`;
    const logoOrange = `${window.location.href}images/wikis/logo-tf-gray.png`;

    if (element.src === logoOrange) {
        element.src = logoGray;
    } else {
        element.src = logoOrange;
    }
}

function homepageSwitch(wiki) {
    const wikiName = document.querySelector(`#wiki-${wiki} > .wiki-container > .wiki-name`).textContent;
    const wikiImage = document.querySelector(`#wiki-${wiki} > .wiki-container > .wiki-icon`).src;

    if (wiki !== "tf") {
        document.querySelector(".homepage-wiki > #homepage-link > #homepage-logo").className = "wlogo";
    } else {
        document.querySelector(".homepage-wiki > #homepage-link > #homepage-logo").className = "otfwlogo otfwlogoslow active";
    }

    document.querySelector(".homepage-wiki > #homepage-link > #homepage-logo").src = wikiImage;
    document.querySelector(".homepage-wiki > #homepage-link").href = `/wiki/${wiki}`;
    document.querySelector(".homepage-wiki > .wiki-name").textContent = wikiName;
    document.querySelector(".homepage-search > #homepage-user").placeholder = `Search user on ${wikiName}...`;
    document.querySelector(".current-wiki").textContent = wikiName;

    selectedWiki = wiki;
}
// End homepage/wikipage fluff

// Begin dark mode toggle
function toggleDarkMode(useLocalStorage = false) {
    if (useLocalStorage) {
        if (localStorage.getItem("dark11") === "1") {
            localStorage.setItem("dark11", "0");
        } else {
            localStorage.setItem("dark11", "1");
        }
    }

    document.body.classList.toggle("dark");

    for (const element of document.getElementsByTagName("button")) {
        element.classList.toggle("darkbutton");
    }

    for (const element of document.getElementsByTagName("input")) {
        element.classList.toggle("darkinput");
    }

    for (const element of document.getElementsByTagName("small")) {
        element.classList.toggle("darksmall");
    }

    // Desktop toggle btn
    const toggleDesktop = document.getElementById("dark-mode-toggle");
    if (document.body.classList.contains("dark")) {
        toggleDesktop.innerText = "Lights Off";
    } else {
        toggleDesktop.innerText = "Lights On";
    }

    // Mobile toggle btn
    const toggleMobile = document.getElementById("dark-mode-toggle-mobile");
    if (toggleMobile) {
        if (toggleMobile.classList.contains("icon-moon")) {
            toggleMobile.classList.remove("icon-moon");
            toggleMobile.classList.add("icon-sun");
            toggleMobile.setAttribute("title", "Enable Light Mode");
        } else {
            toggleMobile.classList.remove("icon-sun");
            toggleMobile.classList.add("icon-moon");
            toggleMobile.setAttribute("title", "Enable Dark Mode");
        }
    }

    // Underlords Wiki specific
    if (selectedWiki === "underlords") {
        if (document.body.classList.contains("dark")) {
            document.querySelector(".wlogo").src = "/images/wikis/logo-underlords-dark.png";
        } else {
            document.querySelector(".wlogo").src = "/images/wikis/logo-underlords.png";
        }
    }
}
// End dark mode toggle

// Begin Claim User feature
function getClaims() {
    userClaims = JSON.parse(localStorage.getItem("claims"));

    if (userClaims) {
        document.getElementById("me-wikis-list").innerHTML = "";
        document.getElementById("me-wikis").style = "display: initial";

        Object.keys(userClaims).forEach(function (key) {
            document.getElementById("me-wikis-list").innerHTML += `
            <li>
                <a href="/user/${key}/${userClaims[key]}">
                    <img class="wiki-icon" src="/images/wikis/logo-${key}.png">
                    ${userClaims[key]} @ ${key}wiki
                </a>
            </li>
            `;
        });

        document.getElementById("me-wikis-list").innerHTML += `
        <div class="divider"></div>
        <li>
            <a href="#" class="text-center" style="color: #F44336" onclick="clearClaims();">Forget</a>
        </li>
        `;
    }
}

function clearClaims() {
    if (confirm("Are you sure?")) {
        localStorage.clear("claims");

        getClaims();
    }
}
// End Claim User feature
