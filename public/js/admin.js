document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const res = await fetch("/admin/login", { method: "POST", body: formData });
  const data = await res.json();
  if (data.success) {
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("adminDashboard").style.display = "block";
    // You can add functions to load chart and feedback
  } else {
    alert("Login failed");
  }
});