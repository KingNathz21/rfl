window.RouteFlowFirebaseConfig = {
  apiKey: "AIzaSyAMZ5bEx4no7psjpzfMOQFyb2ukZ9ymavQ",
  authDomain: "rfldon.firebaseapp.com",
  databaseURL: "https://rfldon-default-rtdb.firebaseio.com",
  projectId: "rfldon",
  storageBucket: "rfldon.firebasestorage.app",
  messagingSenderId: "1097447189862",
  appId: "1:1097447189862:web:a83dc670673e91100eaca7",
  measurementId: "G-CNCXXN7BXV"
};
window.addEventListener("DOMContentLoaded", () => {
  ["desktop-ui-speed.js", "routes-main.js"].forEach((src) => {
    if (document.querySelector(`script[src='${src}']`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  });
});
