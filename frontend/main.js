document.addEventListener("DOMContentLoaded", () => {
  const joinForm = document.getElementById("joinForm");
  const submitForm = document.getElementById("submitForm");
  const output = document.getElementById("output");

  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  if (joinForm) {
    joinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        id: document.getElementById("playerId").value,
        name: document.getElementById("name").value,
      };
      const result = await postJSON("/api/game/join", data);
      output.textContent = JSON.stringify(result, null, 2);
    });
  }

  if (submitForm) {
    submitForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        playerId: document.getElementById("playerId").value,
        roundIndex: parseInt(document.getElementById("roundIndex").value),
        answers: document.getElementById("answers").value.split(",").map(a => a.trim()),
      };
      const result = await postJSON("/api/game/submit", data);
      output.textContent = JSON.stringify(result, null, 2);
    });
  }
});
