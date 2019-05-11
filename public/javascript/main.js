/**** (c) Espacorede Project ****/

const windowProtocol = window.location.protocol;
const windowHost = window.location.host;
let selectedWiki = window.location.pathname.split("/")[2] ? window.location.pathname.split("/")[2] : "tf";

function logoSwitch(element) {
    element.classList.toggle("otfwlogoslow");
    element.classList.toggle("otfwlogofast");

    const logoGrey = window.location.href + "images/wikis/logo-tf.png";
    const logoOrange = window.location.href + "images/wikis/logo-tf-orange.png";

    if (element.src == logoGrey) {
        element.src = logoOrange;
    } else {
        element.src = logoGrey;
    }
}

function searchUser(input) {
    let searchTerm = document.getElementById(input).value;

    const invalidCharacters = /[:#/?@]/g;
    searchTerm = searchTerm.replace(invalidCharacters, "");

    let user = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
    user = user.trim();

    if (user === "") {
        alert("Please insert a valid name.");
        return;
    }

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

function homepageSwitch(wiki) {
    const wikiName = document.querySelector(`#wiki-${wiki} > span`).textContent;
    const wikiImage = document.querySelector(`#wiki-${wiki} > img`).src;

    if (wiki !== "tf") {
        document.getElementById("homepage-logo").className = "wlogo";
    } else {
        document.getElementById("homepage-logo").className = "otfwlogo otfwlogoslow active";
    }

    document.getElementById("homepage-logo").src = wikiImage;
    document.getElementById("homepage-link").href = `/wiki/${wiki}`;
    document.getElementById("homepage-user").placeholder = `Search user on ${wikiName}...`;
    //document.getElementById("homepage-search").textContent = `Search on ${wikiName}`;
    document.getElementById("homepage-wiki").textContent = wikiName;
    selectedWiki = wiki;
}

window.onload = function () {
    if (document.getElementById("user")) {
        document.getElementById("user").addEventListener("keyup", (listener) => {
            listener.preventDefault();

            if (listener.keyCode === 13) {
                if (document.getElementById("user").value) {
                    searchUser("user");
                }
            }
        });
    }

    if (document.getElementById("userBig")) {
        document.getElementById("userBig").addEventListener("keyup", (listener) => {
            listener.preventDefault();

            if (listener.keyCode === 13) {
                if (document.getElementById("userBig").value) {
                    searchUser("userBig");
                }
            }
        });
    }
};