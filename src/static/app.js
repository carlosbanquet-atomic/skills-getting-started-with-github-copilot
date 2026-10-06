document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function createParticipantRow(activity, email) {
    const participant = document.createElement("li");
    participant.className = "participant-row";

    const participantEmail = document.createElement("span");
    participantEmail.textContent = email;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-participant";
    removeButton.dataset.activity = activity;
    removeButton.dataset.email = email;
    removeButton.setAttribute("aria-label", `Remove ${email} from ${activity}`);
    removeButton.title = "Remove participant";
    removeButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

    participant.append(participantEmail, removeButton);
    return participant;
  }

  function addParticipantToCard(activity, email) {
    const activityCard = Array.from(activitiesList.querySelectorAll(".activity-card"))
      .find((card) => card.dataset.activity === activity);
    if (!activityCard) return false;

    const participantList = activityCard.querySelector(".participants-list");
    participantList.querySelector(".no-participants")?.remove();
    participantList.appendChild(createParticipantRow(activity, email));

    const participantCount = activityCard.querySelector(".participant-count");
    const updatedCount = Number(participantCount.textContent) + 1;
    participantCount.textContent = updatedCount;
    activityCard.querySelector(".spots-left").textContent =
      Number(activityCard.dataset.maxParticipants) - updatedCount;
    return true;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activity = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
          <div class="participants">
            <h5>Participants <span class="participant-count">${details.participants.length}</span></h5>
            <ul class="participants-list"></ul>
          </div>
        `;

        const participantList = activityCard.querySelector(".participants-list");
        if (details.participants.length === 0) {
          const emptyMessage = document.createElement("li");
          emptyMessage.className = "no-participants";
          emptyMessage.textContent = "No participants yet";
          participantList.appendChild(emptyMessage);
        } else {
          details.participants.forEach((email) => {
            participantList.appendChild(createParticipantRow(name, email));
          });
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        if (!addParticipantToCard(activity, email)) {
          await fetchActivities();
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".remove-participant");
    if (!removeButton) return;

    const { activity, email } = removeButton.dataset;
    removeButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Failed to remove participant");
      }

      const activityCard = removeButton.closest(".activity-card");
      removeButton.closest(".participant-row").remove();
      const participantCount = activityCard.querySelector(".participant-count");
      const remainingParticipants = Number(participantCount.textContent) - 1;
      participantCount.textContent = remainingParticipants;
      activityCard.querySelector(".spots-left").textContent =
        Number(activityCard.dataset.maxParticipants) - remainingParticipants;

      if (remainingParticipants === 0) {
        const emptyMessage = document.createElement("li");
        emptyMessage.className = "no-participants";
        emptyMessage.textContent = "No participants yet";
        activityCard.querySelector(".participants-list").appendChild(emptyMessage);
      }
    } catch (error) {
      messageDiv.textContent = error.message || "Failed to remove participant";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
    }
  });

  // Initialize app
  fetchActivities();
});
