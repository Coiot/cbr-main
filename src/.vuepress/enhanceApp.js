export default ({ router, siteData }) => {
  // This ensures the script runs only on the client side
  if (typeof window !== "undefined") {
    const script = document.createElement("script");
    script.src = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
    script.onload = () => {
      kofiWidgetOverlay.draw("coiot", {
        type: "floating-chat",
        "floating-chat.donateButton.text": "Support Us",
        "floating-chat.donateButton.background-color": "#fcbf47",
        "floating-chat.donateButton.text-color": "#323842",
      });
    };
    document.body.appendChild(script);
  }
};
