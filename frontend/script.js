const sosButton = document.getElementById("sosButton");
const sosMessage = document.getElementById("sosMessage");

async function getCurrentLocation() {
  if (!navigator.geolocation) return {};
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        locationAccuracy: position.coords.accuracy
      }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

sosButton.addEventListener("click", async () => {
  sosButton.disabled = true;
  sosMessage.textContent = "Saving demo alert...";
  try {
    const location = await getCurrentLocation();
    const response = await fetch(`${window.API_BASE}/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...location, message: "Demo SOS alert" })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Could not save alert.");
    }
    sosMessage.textContent = result.message;
  } catch (error) {
    sosMessage.textContent = `${error.message} Check that the backend is running.`;
  } finally {
    sosButton.disabled = false;
  }
});
