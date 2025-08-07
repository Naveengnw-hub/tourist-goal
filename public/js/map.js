document.getElementById("feedbackForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const res = await fetch("/submit", { method: "POST", body: formData });
  alert((await res.json()).message);
});