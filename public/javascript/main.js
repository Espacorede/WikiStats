/**** (c) Espacorede Project ****/

const windowProtocol = window.location.protocol;
const windowHost = window.location.host;
const selectedWiki = window.location.pathname.split("/")[1] ? window.location.pathname.split("/")[1] : "tf";

function logoSwitch(element, orange = false) {
    element.classList.remove("active");

    if (orange) {
        let orangeElement = document.getElementById("cross-o");
        orangeElement.classList.add("active");
    } else {
        let defaultElement = document.getElementById("cross");
        defaultElement.classList.add("active");
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
        const url = `${windowProtocol}//${windowHost}/${selectedWiki}/user/${user}`;
        window.history.pushState({
            path: url
        }, "", url);
        location.reload();
    } else {
        window.location.href = `${windowProtocol}//${windowHost}/${selectedWiki}/user/${user}`;
        location.reload();
    }
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
