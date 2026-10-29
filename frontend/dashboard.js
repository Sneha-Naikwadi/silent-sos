
const API = window.API_BASE;
const message = document.getElementById("dashboardMessage");

async function getJSON(url) {
  const response = await fetch(url);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

// ==========================================
// LOAD SHARED LOCATIONS
// ==========================================

async function loadSharedLocations() {
  const box = document.getElementById("sharedLocations");
  const statusMessage = document.getElementById(
    "sharedLocationsMessage"
  );

  if (!box || !statusMessage) {
    console.error("Shared Locations HTML elements not found.");
    return;
  }

  box.replaceChildren();
  statusMessage.textContent = "Loading shared locations...";

  try {
    const result = await getJSON(
      `${API}/location-shares/shared`
    );

    const locations = Array.isArray(result.data)
      ? result.data
      : [];

    if (locations.length === 0) {
      statusMessage.textContent =
        "No active shared locations found.";
      return;
    }

    statusMessage.textContent =
      `${locations.length} shared location(s) available.`;

    locations.forEach((location) => {
      const card = document.createElement("article");
      card.className = "contact-card";

      // Contact name
      const name = document.createElement("h3");
      name.textContent =
        location.contactName || "Emergency Contact";

      // Coordinates
      const coordinates = document.createElement("p");
      coordinates.textContent =
        `Latitude: ${location.latitude}, ` +
        `Longitude: ${location.longitude}`;

      // Shared date and time
      const sharedAt = document.createElement("p");
      sharedAt.textContent = location.sharedAt
        ? `Shared at: ${new Date(
            location.sharedAt
          ).toLocaleString()}`
        : "Sharing time unavailable";

      // Google Maps link
      const mapLink = document.createElement("a");

      mapLink.href =
        `https://www.google.com/maps?q=${encodeURIComponent(
          location.latitude
        )},${encodeURIComponent(location.longitude)}`;

      mapLink.target = "_blank";
      mapLink.rel = "noopener noreferrer";
      mapLink.textContent = "View on Google Maps";

      // Revoke Location button
      const revokeButton = document.createElement("button");

      revokeButton.textContent = "Revoke Location";
      revokeButton.className = "delete-btn";

      revokeButton.addEventListener("click", async () => {
        const confirmed = confirm(
          `Revoke location sharing for ${
            location.contactName || "this contact"
          }?`
        );

        if (!confirmed) return;

        revokeButton.disabled = true;
        statusMessage.textContent =
          "Revoking location sharing...";

        try {
          const shareId = location.id || location._id;

          if (!shareId) {
            throw new Error(
              "Location-sharing ID is missing."
            );
          }

          const response = await fetch(
            `${API}/location-shares/${encodeURIComponent(
              shareId
            )}/revoke`,
            {
              method: "PATCH"
            }
          );

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(
              result.message ||
              "Could not revoke location sharing."
            );
          }

          statusMessage.textContent =
            "Location sharing revoked successfully.";

          // Reload the list to remove the revoked location
          await loadSharedLocations();
        } catch (error) {
          console.error("Revoke location error:", error);

          statusMessage.textContent = error.message;
          revokeButton.disabled = false;
        }
      });

      card.append(
        name,
        coordinates,
        sharedAt,
        mapLink,
        document.createElement("br"),
        revokeButton
      );

      box.append(card);
    });
  } catch (error) {
    console.error("Shared locations error:", error);

    statusMessage.textContent =
      `Could not load shared locations: ${error.message}`;
  }
}

// ==========================================
// LOAD DASHBOARD
// ==========================================

async function loadDashboard() {
  try {
    const [
      statsResult,
      contactsResult,
      alertsResult
    ] = await Promise.all([
      getJSON(`${API}/dashboard/stats`),
      getJSON(`${API}/contacts`),
      getJSON(`${API}/alerts`)
    ]);

    // Dashboard statistics
    const stats = statsResult.data;

    document.getElementById("totalContacts").textContent =
      stats.totalContacts;

    document.getElementById("totalAlerts").textContent =
      stats.totalAlerts;

    document.getElementById("activeAlerts").textContent =
      stats.activeAlerts;

    document.getElementById("resolvedAlerts").textContent =
      stats.resolvedAlerts;

    // ==========================================
    // SAVED EMERGENCY CONTACTS
    // ==========================================

    const contactsBox = document.getElementById(
      "dashboardContacts"
    );

    contactsBox.replaceChildren();

    const contacts = Array.isArray(contactsResult.data)
      ? contactsResult.data
      : [];

    if (contacts.length === 0) {
      contactsBox.textContent = "No contacts added yet.";
    } else {
      contacts.forEach((contact) => {
        const row = document.createElement("article");
        row.className = "contact-card";

        const name = document.createElement("h3");
        name.textContent = contact.name || "Unnamed contact";

        const phone = document.createElement("p");
        phone.textContent =
          `Phone: ${contact.phone || "Not available"}`;

        row.append(name, phone);
        contactsBox.append(row);
      });
    }

    // ==========================================
    // SOS ALERT HISTORY
    // ==========================================

    const alertsBox = document.getElementById("alertsList");

    alertsBox.replaceChildren();

    const alerts = Array.isArray(alertsResult.data)
      ? alertsResult.data
      : [];

    if (alerts.length === 0) {
      alertsBox.textContent =
        "No SOS alerts yet. Use the SOS Home button " +
        "to create a demo alert.";
    } else {
      alerts.forEach((alert) => {
        const row = document.createElement("article");
        row.className = "alert-card";

        const info = document.createElement("div");

        const title = document.createElement("h3");
        title.textContent =
          `SOS Alert · ${new Date(
            alert.createdAt
          ).toLocaleString()}`;

        const status = document.createElement("p");
        status.textContent = `Status: ${alert.status}`;

        info.append(title, status);

        // View SOS alert location
        if (
          Number.isFinite(alert.latitude) &&
          Number.isFinite(alert.longitude)
        ) {
          const mapLink = document.createElement("a");

          mapLink.href =
            `https://www.google.com/maps?q=${
              alert.latitude
            },${alert.longitude}`;

          mapLink.target = "_blank";
          mapLink.rel = "noopener noreferrer";
          mapLink.textContent = "View location";

          info.append(mapLink);
        }

        row.append(info);

        // Mark alert as resolved
        if (alert.status !== "resolved") {
          const button = document.createElement("button");

          button.textContent = "Mark Resolved";

          button.addEventListener("click", async () => {
            button.disabled = true;

            try {
              const alertId = alert._id || alert.id;

              const response = await fetch(
                `${API}/alerts/${encodeURIComponent(
                  alertId
                )}/status`,
                {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    status: "resolved"
                  })
                }
              );

              const result = await response.json();

              if (!response.ok || !result.success) {
                throw new Error(
                  result.message ||
                  "Could not resolve alert."
                );
              }

              message.textContent =
                "Alert marked as resolved.";

              await loadDashboard();
            } catch (error) {
              console.error("Resolve alert error:", error);

              message.textContent = error.message;
              button.disabled = false;
            }
          });

          row.append(button);
        } else {
          const badge = document.createElement("span");

          badge.className = "resolved-label";
          badge.textContent = "Resolved";

          row.append(badge);
        }

        alertsBox.append(row);
      });
    }

    message.textContent = "";
  } catch (error) {
    console.error("Dashboard load error:", error);

    message.textContent =
      `Could not load dashboard: ${error.message}. ` +
      "Check backend and API URL.";
  }
}

// ==========================================
// INITIAL LOAD
// ==========================================

loadDashboard();
loadSharedLocations();
