document.addEventListener("DOMContentLoaded", () => {
  const createForm = document.getElementById("createForm");
  const joinForm = document.getElementById("joinForm");
  const submitForm = document.getElementById("submitForm");
  const output = document.getElementById("output");

  async function postJSON(url, data) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = text;
      }

      return { ok: res.ok, result };
    } catch (err) {
      console.error("Network error:", err);
      return { ok: false, result: { error: "Failed to connect to server." } };
    }
  }

  // --- CREATE LOBBY ---
  if (createForm) {
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        hostId: document.getElementById("hostId").value.trim(),
        hostName: document.getElementById("hostName").value.trim(),
      };

      const { ok, result } = await postJSON("/api/game/create", data);

      if (ok) {
        // Save host info 
        localStorage.setItem("playerId", data.hostId);
        localStorage.setItem("playerName", data.hostName);
        localStorage.setItem("lobbyCode", result.lobbyCode);

        window.location.href =
          `lobby.html?code=${result.lobbyCode}&playerId=${data.hostId}&name=${data.hostName}&isHost=true`;

      } else {
        output.textContent = result.error || "Failed to create lobby.";
      }
    });
  }


  // --- JOIN EXISTING LOBBY ---
  if (joinForm) {
    joinForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        code: document.getElementById("lobbyCode").value.trim(),
        id: document.getElementById("playerId").value.trim(),
        name: document.getElementById("name").value.trim(),
      };

      const { ok, result } = await postJSON("/api/game/join", data);

      if (ok) {
        localStorage.setItem("playerId", data.id);
        localStorage.setItem("playerName", data.name);
        localStorage.setItem("lobbyCode", data.code);

        window.location.href = "lobby.html";
      } else {
        output.textContent = result.error || "Failed to join lobby.";
      }
    });
  }

  // --- SUBMIT ANSWERS ---
  if (submitForm) {
    submitForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        playerId: document.getElementById("playerId").value.trim(),
        roundIndex: parseInt(document.getElementById("roundIndex").value),
        answers: document
          .getElementById("answers")
          .value.split(",")
          .map((a) => a.trim()),
      };

      const { ok, result } = await postJSON("/api/game/submit", data);

      output.textContent = ok
        ? JSON.stringify(result, null, 2)
        : result.error || "Error submitting answers.";
    });
  }

  // --- LOBBY PAGE INFO ---
  if (window.location.pathname.endsWith("lobby.html")) {
    const playerId = localStorage.getItem("playerId");
    const playerName = localStorage.getItem("playerName");
    const lobbyCode = localStorage.getItem("lobbyCode");
    const playerInfo = document.getElementById("playerInfo");

    if (playerInfo) {
      playerInfo.textContent = playerId && playerName
        ? `Player: ${playerName} (ID: ${playerId}) — Lobby: ${lobbyCode}`
        : "Player information not found.";
    }
  }
});
