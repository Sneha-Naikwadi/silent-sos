// ==========================================
// SILENT SOS FRONTEND
// ==========================================


// Backend URL
const API_URL = "https://silent-sos-xg08.onrender.com";


// ==========================================
// DOM ELEMENTS
// ==========================================

const contactForm =
    document.getElementById("contactForm");

const contactsList =
    document.getElementById("contactsList");

const contactCount =
    document.getElementById("contactCount");

const sosButton =
    document.getElementById("sosButton");

const heroSosButton =
    document.getElementById("heroSosButton");

const statusTitle =
    document.getElementById("statusTitle");

const statusMessage =
    document.getElementById("statusMessage");


// ==========================================
// LOAD CONTACTS
// ==========================================

async function loadContacts() {

    try {

        console.log("Loading contacts...");

        const response =
            await fetch(
                `${API_URL}/api/contacts`
            );


        const data =
            await response.json();


        console.log(
            "Contacts response:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load contacts"
            );

        }


        displayContacts(
            data.contacts || []
        );


    } catch (error) {

        console.error(
            "Load contacts error:",
            error
        );

        contactsList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ⚠️
                </div>

                <p>
                    Unable to load contacts.
                </p>

            </div>

        `;

    }

}


// ==========================================
// DISPLAY CONTACTS
// ==========================================

function displayContacts(contacts) {

    contactCount.textContent =
        contacts.length;


    if (contacts.length === 0) {

        contactsList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    👥
                </div>

                <p>
                    No emergency contacts added.
                </p>

            </div>

        `;

        return;
    }


    contactsList.innerHTML = "";


    contacts.forEach(
        (contact) => {

            const contactItem =
                document.createElement("div");

            contactItem.className =
                "contact-item";


            contactItem.innerHTML = `

                <div class="contact-info">

                    <h3>
                        ${escapeHtml(contact.name)}
                    </h3>

                    <p>
                        📧 ${escapeHtml(contact.email)}
                    </p>

                    <p>
                        📱 ${
                            contact.phone
                                ? escapeHtml(contact.phone)
                                : "Phone not provided"
                        }
                    </p>

                </div>

                <div class="contact-avatar">
                    👤
                </div>

            `;


            contactsList.appendChild(
                contactItem
            );

        }
    );

}


// ==========================================
// ADD CONTACT
// ==========================================

contactForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const name =
            document
                .getElementById("name")
                .value
                .trim();


        const email =
            document
                .getElementById("email")
                .value
                .trim();


        const phone =
            document
                .getElementById("phone")
                .value
                .trim();


        if (!name || !email) {

            alert(
                "Please enter name and email."
            );

            return;
        }


        const button =
            contactForm.querySelector(
                "button[type='submit']"
            );


        button.disabled = true;

        button.textContent =
            "Adding Contact...";


        try {

            console.log(
                "Adding contact..."
            );


            const response =
                await fetch(
                    `${API_URL}/api/contacts`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            name,
                            email,
                            phone

                        })
                    }
                );


            const data =
                await response.json();


            console.log(
                "Add contact response:",
                data
            );


            if (!response.ok ||
                !data.success) {

                throw new Error(
                    data.message ||
                    "Unable to add contact"
                );

            }


            alert(
                "Emergency contact added successfully!"
            );


            contactForm.reset();


            await loadContacts();


            updateStatus(
                "Contact Added",
                "Your emergency contact has been saved successfully."
            );


        } catch (error) {

            console.error(
                "Add contact error:",
                error
            );


            alert(
                "Unable to add contact.\n\n" +
                error.message
            );

        } finally {

            button.disabled = false;

            button.textContent =
                "+ Add Emergency Contact";

        }

    }
);


// ==========================================
// SOS BUTTON
// ==========================================

sosButton.addEventListener(
    "click",
    sendSOS
);


heroSosButton.addEventListener(
    "click",
    sendSOS
);


// ==========================================
// SEND SOS
// ==========================================

async function sendSOS() {

    const confirmed =
        confirm(
            "Are you sure you want to send an SOS emergency alert?"
        );


    if (!confirmed) {

        return;
    }


    updateStatus(
        "Getting Location...",
        "Please allow location access."
    );


    if (!navigator.geolocation) {

        alert(
            "Geolocation is not supported by your browser."
        );

        updateStatus(
            "Location Error",
            "Your browser does not support location services."
        );

        return;
    }


    navigator.geolocation.getCurrentPosition(

        async function (position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            console.log(
                "Latitude:",
                latitude
            );

            console.log(
                "Longitude:",
                longitude
            );


            await createSOS(
                latitude,
                longitude
            );

        },

        function (error) {

            console.error(
                "Location error:",
                error
            );


            alert(
                "Unable to get your location.\n\n" +
                "Please allow location permission and try again."
            );


            updateStatus(
                "Location Permission Required",
                "Please allow browser location access."
            );

        },

        {
            enableHighAccuracy: true,

            timeout: 10000,

            maximumAge: 0
        }

    );

}


// ==========================================
// CREATE SOS API REQUEST
// ==========================================

async function createSOS(
    latitude,
    longitude
) {

    try {

        updateStatus(
            "Sending SOS...",
            "Your emergency alert is being sent."
        );


        const response =
            await fetch(
                `${API_URL}/api/alerts`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        latitude,
                        longitude

                    })
                }
            );


        const data =
            await response.json();


        console.log(
            "SOS response:",
            data
        );


        if (!response.ok ||
            !data.success) {

            throw new Error(
                data.message ||
                "Unable to send SOS"
            );

        }


        updateStatus(
            "SOS Sent Successfully",
            "Your emergency contacts have been notified."
        );


        alert(
            "🚨 SOS ALERT SENT SUCCESSFULLY!\n\n" +
            "Your emergency contacts have been notified."
        );


        // Open location in Google Maps
        const mapLink =
            `https://www.google.com/maps?q=${latitude},${longitude}`;


        console.log(
            "Location:",
            mapLink
        );


    } catch (error) {

        console.error(
            "SOS error:",
            error
        );


        updateStatus(
            "SOS Failed",
            error.message
        );


        alert(
            "Unable to send SOS.\n\n" +
            error.message
        );

    }

}


// ==========================================
// STATUS UPDATE
// ==========================================

function updateStatus(
    title,
    message
) {

    statusTitle.textContent =
        title;

    statusMessage.textContent =
        message;

}


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


// ==========================================
// INITIAL LOAD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadContacts();

    }
);