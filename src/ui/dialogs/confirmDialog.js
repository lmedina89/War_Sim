export function createConfirmDialogController({ elements = {} } = {}) {
  const { dialog, title, message } = elements;
  if (!dialog || !title || !message) throw new Error("Confirm dialog controller requires dialog, title, and message elements.");

  function confirm(titleText, messageText) {
    title.textContent = titleText;
    message.textContent = messageText;
    return new Promise(resolve => {
      const handler = () => {
        dialog.removeEventListener("close", handler);
        resolve(dialog.returnValue === "confirm");
      };
      dialog.addEventListener("close", handler);
      dialog.showModal();
    });
  }

  return { confirm };
}
