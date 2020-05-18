const copyTextfield = document.querySelector(".js-copy-t");
const copyButton = document.querySelector(".js-copy-b");

copyButton.addEventListener("click", () => {
    copyTextfield.select();
    document.execCommand("copy");
});

document.addEventListener("change", (evt) => {
    const target = evt.target;
    const isToggle = target.getAttribute("name") === "league";
    if (isToggle) {
        const icalUrl = target.parentElement.querySelector(".js-ical").value;
        copyTextfield.value = icalUrl;
    }
});
