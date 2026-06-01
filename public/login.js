const loginForm = document.querySelector("#loginForm");
const loginId = document.querySelector("#loginId");
const loginPassword = document.querySelector("#loginPassword");
const loginMessage = document.querySelector("#loginMessage");
const toast = document.querySelector("#toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "로그인 중입니다.";
  loginMessage.classList.remove("error");

  try {
    const response = await maruFetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: loginId.value.trim(),
        password: loginPassword.value,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      loginMessage.textContent = result.message || "아이디 또는 비밀번호가 올바르지 않습니다.";
      loginMessage.classList.add("error");
      showToast("로그인 정보를 확인해주세요.");
      return;
    }

    sessionStorage.setItem("maruAdminLoggedIn", "true");
    sessionStorage.setItem("maruAdminUser", JSON.stringify(result.user));
    window.location.href = "./index.html";
  } catch (error) {
    loginMessage.textContent = "서버에 연결할 수 없습니다.";
    loginMessage.classList.add("error");
    showToast("API 서버 실행 상태를 확인해주세요.");
  }
});
