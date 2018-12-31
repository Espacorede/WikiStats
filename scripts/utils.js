function formatNumber(number) {
    return number.toLocaleString("en-UK");
}

function generateRandomErrorMessage() {
    let messages = [
        "This is a real fricking embarrassment.",
        "We failed, men.",
        "Mmmmmmmmmpffffff!",
        "That wasn't supposed to happen!",
        "Tell me, where did we go so wrong?",
        "That just ain't right!",
        "This is unacceptable.",
        "That's some shonky business right there.",
        "Not our finest moment.",
        "Crap, the administrator is going to kill me.",
        "Oh no. Gentlemen, this never happened."
    ];


    let random = Math.floor(Math.random() * messages.length);
    return messages[random];
}

module.exports = {
    renderInternalErrorPage: (res) => {
        res.status(500).render("error", {
            errorCode: 500,
            errorTitle: "Internal Server Error",
            errorMessage: generateRandomErrorMessage(),
            errorReturnToMain: false,
            partials: {
                header: "common/header"
            }
        });
    },

    renderNotFoundPage: (res) => {
        res.status(404).render("error", {
            errorCode: 404,
            errorTitle: "Not Found",
            errorReturnToMain: true,
            partials: {
                header: "common/header"
            }
        });
    },

    formatNumber: formatNumber,

    roundAndFormatNumber: (number, decimals = 1) => {
        return formatNumber(Number(number.toFixed(decimals)));
    },

    returnCleanUsername: (name) => {
        let user = name.trim();
        user = user.charAt(0).toUpperCase() + user.slice(1);
        return user;
    }
};