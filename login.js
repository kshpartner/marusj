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

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const isAdminLogin = loginId.value.trim() === "admin" && loginPassword.value === "1";
  if (!isAdminLogin) {
    loginMessage.textContent = "아이디 또는 비밀번호가 올바르지 않습니다.";
    loginMessage.classList.add("error");
    showToast("로그인 정보를 확인해주세요.");
    return;
  }

  sessionStorage.setItem("maruAdminLoggedIn", "true");
  window.location.href = "./index.html";
});
