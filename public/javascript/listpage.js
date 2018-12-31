window.onload = () => {
    document.getElementById("userBig").addEventListener("keyup", (listener) => {
        listener.preventDefault();

        if (listener.keyCode === 13) {
            if (document.getElementById("userBig").value) {
                searchUser("userBig");
            }
        }
    });

    const table = document.getElementsByTagName("th")[0];
    sorttable.innerSortFunction.apply(table, []);
};