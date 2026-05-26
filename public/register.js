const salesRegisterForm = document.querySelector("#salesRegisterForm");
const salesUsername = document.querySelector("#salesUsername");
const salesPassword = document.querySelector("#salesPassword");
const salesName = document.querySelector("#salesName");
const salesPhone = document.querySelector("#salesPhone");
const salesEmail = document.querySelector("#salesEmail");
const salesAgreeTerms = document.querySelector("#salesAgreeTerms");
const salesAgreePrivacy = document.querySelector("#salesAgreePrivacy");
const salesRegisterMessage = document.querySelector("#salesRegisterMessage");
const toast = document.querySelector("#toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

salesRegisterForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const response = await fetch("/api/sales/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: salesUsername.value.trim(),
        password: salesPassword.value,
        name: salesName.value.trim(),
        phone: salesPhone.value.trim(),
        email: salesEmail.value.trim(),
        agreedTerms: salesAgreeTerms.checked,
        agreedPrivacy: salesAgreePrivacy.checked,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      salesRegisterMessage.textContent = result.message || "회원가입 정보를 확인해주세요.";
      salesRegisterMessage.classList.add("error");
      showToast("회원가입에 실패했습니다.");
      return;
    }

    salesRegisterForm.reset();
    salesRegisterMessage.textContent = `${result.sales.uid} 영업사원 계정이 생성되었습니다.`;
    salesRegisterMessage.classList.remove("error");
    showToast("회원가입이 완료되었습니다.");
  } catch {
    salesRegisterMessage.textContent = "서버에 연결할 수 없습니다.";
    salesRegisterMessage.classList.add("error");
    showToast("API 서버 실행 상태를 확인해주세요.");
  }
});
