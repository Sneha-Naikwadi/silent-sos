
const API_URL = `${window.API_BASE}/contacts`;
const LOCATION_SHARE_API = `${window.API_BASE}/location-shares`;

const form = document.getElementById("contactForm");
const contactsList = document.getElementById("contactsList");
const message = document.getElementById("message");

async function loadContacts() {
  contactsList.textContent = "Loading contacts...";

  try {
    const response = await fetch(API_URL);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Could not load contacts.");
    }

    const contacts = Array.isArray(result.data) ? result.data : [];
    contactsList.replaceChildren();

    if (!contacts.length) {
      contactsList.textContent = "No contacts added yet.";
      return;
    }

    contacts.forEach((contact) => {
      const card = document.createElement("article");
      card.className = "contact-card";

      const details = document.createElement("div");
      const name = document.createElement("h3");
      name.textContent = contact.name || "Unnamed contact";

      const phone = document.createElement("p");
      phone.textContent = `Phone: ${contact.phone || "Not available"}`;

      details.append(name, phone);

      if (contact.email) {
        const email = document.createElement("p");
        email.textContent = `Email: ${contact.email}`;
        details.append(email);
      }

      if (contact.relationship) {
        const relationship = document.createElement("p");
        relationship.textContent = `Relationship: ${contact.relationship}`;
        details.append(relationship);
      }

      // Generate location-sharing link
      const generateButton = document.createElement("button");
      generateButton.type = "button";
      generateButton.textContent = "Generate Location Link";

      const linkArea = document.createElement("div");
      linkArea.hidden = true;

      const linkInput = document.createElement("input");
      linkInput.type = "text";
      linkInput.readOnly = true;
      linkInput.setAttribute("aria-label", "Location-sharing link");
      linkInput.style.width = "100%";
      linkInput.style.marginTop = "8px";

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.textContent = "Copy Link";
      copyButton.style.marginTop = "8px";

      const shareButton = document.createElement("button");
      shareButton.type = "button";
      shareButton.textContent = "Share via WhatsApp";
      shareButton.style.marginTop = "8px";

      linkArea.append(linkInput, copyButton, shareButton);

      generateButton.addEventListener("click", async () => {
        const contactId = contact._id || contact.id;

        if (!contactId) {
          message.textContent = "Contact ID is missing.";
          return;
        }

        generateButton.disabled = true;
        generateButton.textContent = "Generating link...";
        message.textContent = "";

        try {
          const response = await fetch(LOCATION_SHARE_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contactId })
          });

          const result = await response.json();

          if (!response.ok || !result.success || !result.link) {
            throw new Error(
              result.message || "Could not generate location link."
            );
          }

          linkInput.value = result.link;
          linkArea.hidden = false;

          message.textContent =
            `Link generated for ${contact.name}. It expires in 15 minutes.`;
        } catch (error) {
          message.textContent = error.message;
        } finally {
          generateButton.disabled = false;
          generateButton.textContent = "Generate Location Link";
        }
      });

      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(linkInput.value);
          message.textContent = "Location link copied. You can share it with the contact.";
        } catch {
          linkInput.focus();
          linkInput.select();
          message.textContent =
            "Automatic copy failed. Press Ctrl+C to copy the selected link.";
        }
      });

      shareButton.addEventListener("click", () => {
        const phoneNumber = (contact.phone || "").replace(/\D/g, "");

        if (!phoneNumber) {
          message.textContent = "This contact has no valid phone number.";
          return;
        }

        const text = encodeURIComponent(
          `Please open this Silent SOS link and choose whether to share your current location. The link expires in 15 minutes:\n${linkInput.value}`
        );

        window.open(
          `https://wa.me/${phoneNumber}?text=${text}`,
          "_blank",
          "noopener,noreferrer"
        );
      });

      // Delete contact
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-btn";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", async () => {
        if (!confirm(`Delete ${contact.name}?`)) return;

        deleteButton.disabled = true;

        try {
          const id = contact._id || contact.id;

          const res = await fetch(
            `${API_URL}/${encodeURIComponent(id)}`,
            { method: "DELETE" }
          );

          const data = await res.json();

          if (!res.ok || !data.success) {
            throw new Error(data.message || "Delete failed.");
          }

          message.textContent = "Contact deleted successfully.";
          await loadContacts();
        } catch (error) {
          message.textContent = error.message;
          deleteButton.disabled = false;
        }
      });

      card.append(
        details,
        generateButton,
        linkArea,
        deleteButton
      );

      contactsList.append(card);
    });
  } catch (error) {
    console.error("Load contacts error:", error);
    contactsList.textContent = `Unable to load contacts: ${error.message}`;
  }
}

// Add contact
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const contact = {
    name: document.getElementById("name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    relationship: document.getElementById("relationship").value.trim()
  };

  message.textContent = "Saving contact...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Could not save contact.");
    }

    message.textContent = "Contact saved successfully!";
    form.reset();
    await loadContacts();
  } catch (error) {
    console.error("Save contact error:", error);
    message.textContent = `${error.message} Check the backend connection.`;
  }
});

loadContacts();
